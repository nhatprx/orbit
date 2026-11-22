import { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  FilePlus2,
  FolderPlus,
  LayoutGrid,
  List,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type {
  CloudBreadcrumbItem,
  CloudPermissions,
  CloudSortBy,
  CloudSortDir,
  CloudView,
} from '../../types/cloud.types';
import { viewDisplayTitle } from './cloudFormat';
import { CloudSearchSortBar } from './CloudSearchSortBar';

export type FinderViewMode = 'icons' | 'list' | 'columns';

interface CloudToolbarProps {
  view: CloudView;
  viewMode: FinderViewMode;
  locationLabel: string;
  breadcrumbs: CloudBreadcrumbItem[];
  canGoBack: boolean;
  canGoForward: boolean;
  search: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  permissions: CloudPermissions;
  hasNodes: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onViewModeChange: (mode: FinderViewMode) => void;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: CloudSortBy) => void;
  onToggleSortDir: () => void;
  onUploadFiles: (files: File[]) => void;
  onOpenNewDocument: () => void;
  onOpenNewFolder: () => void;
  onEmptyTrash: () => void;
}

const MODES: Array<{ id: FinderViewMode; label: string; icon: typeof List }> = [
  { id: 'icons', label: 'Icons view', icon: LayoutGrid },
  { id: 'list', label: 'List view', icon: List },
  { id: 'columns', label: 'Columns view', icon: Columns3 },
];

export function CloudToolbar({
  view, viewMode, locationLabel, breadcrumbs, canGoBack, canGoForward,
  search, sortBy, sortDir, permissions, hasNodes, onGoBack, onGoForward,
  onViewModeChange, onSearchChange, onSortByChange, onToggleSortDir,
  onUploadFiles, onOpenNewDocument, onOpenNewFolder, onEmptyTrash,
}: CloudToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const title =
    view === 'ALL'
      ? (breadcrumbs[breadcrumbs.length - 1]?.name ?? locationLabel)
      : viewDisplayTitle(view);

  return (
    <div className="bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
            <button
              type="button"
              aria-label="Back"
              disabled={!canGoBack}
              onClick={onGoBack}
              className="flex h-7 w-7 items-center justify-center border-r border-[#30363D] text-[#8B949E] hover:text-[#22C55E] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Forward"
              disabled={!canGoForward}
              onClick={onGoForward}
              className="flex h-7 w-7 items-center justify-center text-[#8B949E] hover:text-[#22C55E] disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <h2 className="truncate text-sm font-semibold text-[#E6EDF3]">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="View mode" className="flex items-center border border-[#30363D] bg-[#0D1117]">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = viewMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  aria-label={m.label}
                  aria-pressed={active}
                  onClick={() => onViewModeChange(m.id)}
                  className={`flex h-7 w-8 items-center justify-center border-r border-[#30363D] last:border-r-0 transition-colors ${
                    active ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              );
            })}
          </div>

          {view !== 'TRASH' && permissions.canWrite && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                aria-label="Select files to upload"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  if (list.length > 0) onUploadFiles(list);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="secondary" onClick={onOpenNewDocument}>
                <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                New Document
              </Button>
              <Button type="button" variant="secondary" onClick={onOpenNewFolder}>
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                New Folder
              </Button>
              <Button type="button" variant="primary" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                Upload Files
              </Button>
            </>
          )}

          {view === 'TRASH' && permissions.canManage && (
            <Button
              type="button"
              variant="secondary"
              disabled={!hasNodes}
              onClick={onEmptyTrash}
              className="border-[#EF4444]/60 text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      <CloudSearchSortBar
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        onSearchChange={onSearchChange}
        onSortByChange={onSortByChange}
        onToggleSortDir={onToggleSortDir}
      />
    </div>
  );
}
