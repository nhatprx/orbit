import { useRef } from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  Search,
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

interface CloudToolbarProps {
  view: CloudView;
  breadcrumbs: CloudBreadcrumbItem[];
  search: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  permissions: CloudPermissions;
  hasNodes: boolean;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: CloudSortBy) => void;
  onToggleSortDir: () => void;
  onNavigateFolder: (folderId: string | null) => void;
  onUploadFiles: (files: File[]) => void;
  onOpenNewDocument: () => void;
  onOpenNewFolder: () => void;
  onEmptyTrash: () => void;
}

export function CloudToolbar({
  view,
  breadcrumbs,
  search,
  sortBy,
  sortDir,
  permissions,
  hasNodes,
  onSearchChange,
  onSortByChange,
  onToggleSortDir,
  onNavigateFolder,
  onUploadFiles,
  onOpenNewDocument,
  onOpenNewFolder,
  onEmptyTrash,
}: CloudToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-b border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2.5">
        <nav aria-label="Folder breadcrumbs" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
          {view === 'ALL' ? (
            <>
              <button
                type="button"
                onClick={() => onNavigateFolder(null)}
                className={`px-1.5 py-0.5 font-medium transition-colors ${
                  breadcrumbs.length === 0
                    ? 'text-[#22C55E]'
                    : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                Root
              </button>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
                    <button
                      type="button"
                      onClick={() => onNavigateFolder(crumb.id)}
                      className={`max-w-44 truncate px-1.5 py-0.5 font-medium transition-colors ${
                        isLast
                          ? 'text-[#22C55E]'
                          : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </span>
                );
              })}
            </>
          ) : (
            <span className="font-mono text-xs uppercase tracking-wider text-[#22C55E]">
              {view === 'STARRED' ? 'Starred Items' : 'Trash (Auto-purged after 30 days)'}
            </span>
          )}
        </nav>

        <div className="flex items-center gap-2">
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

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center border border-[#30363D] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
          <Search className="h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files and folders..."
            className="h-7 w-56 bg-transparent px-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="cloud-sort-by" className="font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
            Sort
          </label>
          <select
            id="cloud-sort-by"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as CloudSortBy)}
            className="h-7 border border-[#30363D] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
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
    </div>
  );
}
