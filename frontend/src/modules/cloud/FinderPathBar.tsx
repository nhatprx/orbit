import { ChevronRight } from 'lucide-react';
import type { CloudBreadcrumbItem, CloudView } from '../../types/cloud.types';
import { viewDisplayTitle } from './cloudFormat';

interface FinderPathBarProps {
  locationLabel: string;
  view: CloudView;
  breadcrumbs: CloudBreadcrumbItem[];
  totalCount: number;
  selectedCount: number;
  onNavigateFolder: (folderId: string | null) => void;
}

export function FinderPathBar({
  locationLabel,
  view,
  breadcrumbs,
  totalCount,
  selectedCount,
  onNavigateFolder,
}: FinderPathBarProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#30363D] bg-[#161B22] px-4 py-1.5 text-xs">
      <nav aria-label="Folder breadcrumbs" className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="font-mono text-[11px] text-[#7D8590]">{locationLabel}</span>
        <ChevronRight className="h-3 w-3 text-[#7D8590]" strokeWidth={1.5} />

        {view === 'ALL' ? (
          <>
            <button
              type="button"
              onClick={() => onNavigateFolder(null)}
              className={`px-1 py-0.5 font-mono text-[11px] transition-colors ${
                breadcrumbs.length === 0 ? 'text-[#22C55E]' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Root
            </button>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-[#7D8590]" strokeWidth={1.5} />
                  <button
                    type="button"
                    onClick={() => onNavigateFolder(crumb.id)}
                    className={`max-w-40 truncate px-1 py-0.5 font-mono text-[11px] transition-colors ${
                      isLast ? 'text-[#22C55E]' : 'text-[#8B949E] hover:text-[#E6EDF3]'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              );
            })}
          </>
        ) : (
          <span className="font-mono text-[11px] text-[#22C55E]">{viewDisplayTitle(view)}</span>
        )}
      </nav>

      <div className="flex items-center gap-3 font-mono text-[11px] text-[#7D8590]">
        <span>{totalCount} {totalCount === 1 ? 'item' : 'items'}</span>
        {selectedCount > 0 && (
          <span className="text-[#22C55E]">{selectedCount} selected</span>
        )}
      </div>
    </footer>
  );
}
