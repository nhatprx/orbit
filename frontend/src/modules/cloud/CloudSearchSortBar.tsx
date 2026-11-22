import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react';
import type { CloudSortBy, CloudSortDir } from '../../types/cloud.types';

interface CloudSearchSortBarProps {
  search: string;
  placeholder?: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  selectId?: string;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: CloudSortBy) => void;
  onToggleSortDir: () => void;
}

export function CloudSearchSortBar({
  search,
  placeholder = 'Search files and folders...',
  sortBy,
  sortDir,
  selectId = 'cloud-sort-by',
  onSearchChange,
  onSortByChange,
  onToggleSortDir,
}: CloudSearchSortBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2">
      <div className="flex items-center border border-[#30363D] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
        <Search className="h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 w-56 bg-transparent px-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <label htmlFor={selectId} className="font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
          Sort
        </label>
        <select
          id={selectId}
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as CloudSortBy)}
          className="h-7 rounded-none border border-[#30363D] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="updatedAt">Modified</option>
        </select>
        <button
          type="button"
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          aria-label={`Sort direction: ${sortDir}`}
          onClick={onToggleSortDir}
          className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]"
        >
          {sortDir === 'asc' ? (
            <ArrowDownAZ className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <ArrowUpAZ className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
