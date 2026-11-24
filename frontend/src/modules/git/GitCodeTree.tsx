import { useRef } from 'react';
import {
  ArrowUp, ChevronDown, ChevronRight, ChevronsDownUp, Plus, RefreshCw, Search, X,
} from 'lucide-react';
import type { GitTreeEntryDto } from '../../types/git.types';
import { GitMaterialIcon } from './GitMaterialIcon';
import type { FlatTreeRow } from './gitCodeTreeUtils';

interface GitCodeTreeProps {
  useRecursiveMode: boolean;
  currentDir: string;
  lazyTree: GitTreeEntryDto[];
  rows: FlatTreeRow[];
  filter: string;
  treeLoading: boolean;
  activeFilePath: string | null;
  canWrite: boolean;
  onFilterChange: (value: string) => void;
  onToggleDir: (dirPath: string) => void;
  onCollapseAll: () => void;
  onRefreshTree: () => void;
  onNavigateDir: (dirPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onPrefetchFile: (filePath: string) => void;
  onNewFile: () => void;
}

const ICON_BTN = 'border border-[#30363D] bg-[#0D1117] p-1 text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]';

export function GitCodeTree({
  useRecursiveMode, currentDir, lazyTree, rows, filter, treeLoading, activeFilePath,
  canWrite, onFilterChange, onToggleDir, onCollapseAll, onRefreshTree,
  onNavigateDir, onOpenFile, onPrefetchFile, onNewFile,
}: GitCodeTreeProps) {
  const hoverTimerRef = useRef<number | null>(null);
  const segments = currentDir ? currentDir.split('/').filter(Boolean) : [];
  const parentDir = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

  function schedulePrefetch(filePath: string) {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => onPrefetchFile(filePath), 50);
  }

  function cancelPrefetch() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  const displayRows: FlatTreeRow[] = useRecursiveMode
    ? rows
    : lazyTree.map((entry) => ({ entry, depth: 0, isExpanded: false }));

  return (
    <aside className="flex h-full min-h-0 flex-col border border-[#30363D] bg-[#161B22] lg:col-span-4 xl:col-span-3">
      <div className="flex items-center justify-between gap-2 border-b border-[#30363D] px-3 py-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          {!useRecursiveMode && currentDir && (
            <button type="button" onClick={() => onNavigateDir(parentDir)} title="Parent directory" className={ICON_BTN}>
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {useRecursiveMode && (
            <>
              <button type="button" onClick={onCollapseAll} title="Collapse all folders" className={ICON_BTN}>
                <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={onRefreshTree} title="Refresh file tree" className={ICON_BTN}>
                <RefreshCw className={`h-3.5 w-3.5 ${treeLoading ? 'animate-spin text-[#22C55E]' : ''}`} strokeWidth={1.5} />
              </button>
            </>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={onNewFile}
              className="inline-flex items-center gap-1 border border-[#22C55E] bg-[#22C55E]/10 px-2 py-1 text-[11px] font-medium text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              New File
            </button>
          )}
        </div>
      </div>

      {useRecursiveMode && (
        <div className="relative border-b border-[#30363D] bg-[#0D1117] px-2.5 py-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E7681]" strokeWidth={1.5} />
          <input
            type="text"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter files..."
            aria-label="Filter files"
            className="w-full bg-transparent pl-6 pr-5 font-mono text-xs text-[#E6EDF3] placeholder:text-[#6E7681] focus:outline-none"
          />
          {filter && (
            <button type="button" onClick={() => onFilterChange('')} aria-label="Clear filter" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#E6EDF3]">
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-1">
        {displayRows.length === 0 ? (
          <div className="p-4 text-xs text-[#8A8A8A]">
            {treeLoading ? 'Loading file tree...' : filter ? 'No matching files.' : 'Directory is empty.'}
          </div>
        ) : (
          displayRows.map(({ entry, depth, isExpanded }) => {
            const isDir = entry.type === 'dir';
            const active = !isDir && entry.path === activeFilePath;
            return (
              <button
                key={entry.path}
                type="button"
                title={entry.path}
                style={{ paddingLeft: `${8 + depth * 14}px` }}
                onMouseEnter={() => { if (!isDir) schedulePrefetch(entry.path); }}
                onMouseLeave={cancelPrefetch}
                onClick={() => {
                  if (isDir) {
                    if (useRecursiveMode) onToggleDir(entry.path);
                    else onNavigateDir(entry.path);
                  } else {
                    onOpenFile(entry.path);
                  }
                }}
                className={`group flex w-full items-center gap-1.5 pr-3 py-1 text-left transition-colors ${
                  active
                    ? 'border-l-2 border-l-[#22C55E] bg-[#21262D] text-[#E6EDF3]'
                    : 'border-l-2 border-l-transparent text-[#BDBDBD] hover:bg-[#1F242C] hover:text-[#E6EDF3]'
                }`}
              >
                <span className="flex h-4 w-3.5 shrink-0 items-center justify-center text-[#6E7681]">
                  {isDir ? (
                    isExpanded ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : null}
                </span>
                <GitMaterialIcon name={entry.name} type={isDir ? 'dir' : 'file'} open={isExpanded} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{entry.name}</span>
                {filter && !isDir && entry.path.includes('/') && (
                  <span className="max-w-[90px] truncate font-mono text-[10px] text-[#6E7681]">
                    {entry.path.slice(0, entry.path.lastIndexOf('/'))}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
