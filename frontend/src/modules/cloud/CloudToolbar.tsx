import { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  FilePlus2,
  FolderPlus,
  LayoutGrid,
  List,
  Lock,
  PanelRight,
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
import { InlineSearchSortControls } from './CloudSearchSortBar';

export type FinderViewMode = 'icons' | 'list' | 'columns';

interface CloudToolbarProps {
  view: CloudView;
  viewMode: FinderViewMode;
  inspectorOpen: boolean;
  locationLabel: string;
  breadcrumbs: CloudBreadcrumbItem[];
  canGoBack: boolean;
  canGoForward: boolean;
  search: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  permissions: CloudPermissions;
  folderLocked?: boolean;
  hasNodes: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onViewModeChange: (mode: FinderViewMode) => void;
  onToggleInspector: () => void;
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
  view, viewMode, inspectorOpen, locationLabel, breadcrumbs, canGoBack, canGoForward,
  search, sortBy, sortDir, permissions, folderLocked = false, hasNodes, onGoBack, onGoForward,
  onViewModeChange, onToggleInspector, onSearchChange, onSortByChange, onToggleSortDir,
  onUploadFiles, onOpenNewDocument, onOpenNewFolder, onEmptyTrash,
}: CloudToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const title = view === 'ALL' ? (breadcrumbs[breadcrumbs.length - 1]?.name ?? locationLabel) : viewDisplayTitle(view);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center border border-[#30363D] bg-[#0D1117]">
          <button
            type="button" aria-label="Back" disabled={!canGoBack} onClick={onGoBack}
            className="flex h-7 w-7 items-center justify-center border-r border-[#30363D] text-[#8B949E] hover:text-[#22C55E] disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button" aria-label="Forward" disabled={!canGoForward} onClick={onGoForward}
            className="flex h-7 w-7 items-center justify-center text-[#8B949E] hover:text-[#22C55E] disabled:opacity-35"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <h2 className="max-w-44 truncate text-sm font-semibold text-[#E6EDF3]" title={title}>{title}</h2>
        {folderLocked && (
          <span
            data-testid="cloud-folder-locked-badge"
            title="This folder is locked by the owner"
            className="inline-flex h-6 items-center gap-1 rounded-none border border-[#EAB308]/60 bg-[#EAB308]/10 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#EAB308]"
          >
            <Lock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            LOCKED
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <InlineSearchSortControls
          search={search} sortBy={sortBy} sortDir={sortDir}
          onSearchChange={onSearchChange} onSortByChange={onSortByChange} onToggleSortDir={onToggleSortDir}
        />

        <div role="group" aria-label="View mode" className="flex items-center border border-[#30363D] bg-[#0D1117]">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = viewMode === m.id;
            return (
              <button
                key={m.id} type="button" title={m.label} aria-label={m.label} aria-pressed={active}
                onClick={() => onViewModeChange(m.id)}
                className={`flex h-7 w-7 items-center justify-center border-r border-[#30363D] last:border-r-0 transition-colors ${
                  active ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        <button
          type="button" title="Toggle inspector (Ctrl+I)" aria-label="Toggle inspector" aria-pressed={inspectorOpen}
          onClick={onToggleInspector}
          className={`flex h-7 w-7 items-center justify-center rounded-none border transition-colors ${
            inspectorOpen
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
              : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          <PanelRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        {view !== 'TRASH' && permissions.canWrite && (
          <>
            <input
              ref={fileInputRef} type="file" multiple className="hidden" aria-label="Select files to upload"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                if (list.length > 0) onUploadFiles(list);
                e.target.value = '';
              }}
            />
            <Button type="button" variant="secondary" disabled={folderLocked} onClick={onOpenNewDocument} className="h-7 px-2.5 py-0 text-xs">
              <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.5} />New Document
            </Button>
            <Button type="button" variant="secondary" disabled={folderLocked} onClick={onOpenNewFolder} className="h-7 px-2.5 py-0 text-xs">
              <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />New Folder
            </Button>
            <Button type="button" variant="primary" disabled={folderLocked} onClick={() => fileInputRef.current?.click()} className="h-7 px-2.5 py-0 text-xs">
              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />Upload Files
            </Button>
          </>
        )}

        {view === 'TRASH' && permissions.canManage && (
          <Button
            type="button" variant="secondary" disabled={!hasNodes} onClick={onEmptyTrash}
            className="h-7 border-[#EF4444]/60 px-2.5 py-0 text-xs text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />Empty Trash
          </Button>
        )}
      </div>
    </div>
  );
}
