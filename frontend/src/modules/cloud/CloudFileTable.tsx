import { File, Folder } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { daysUntil, formatRelative } from '../../utils/format';
import { formatBytes } from './cloudFormat';
import { CloudRowActions } from './CloudRowActions';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface CloudFileTableProps {
  nodes: CloudNodeDto[];
  view: CloudView;
  selectedId: string | null;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  permissions: CloudPermissions;
  onSelect: (node: CloudNodeDto) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
  onLoadMore: () => void;
}

export function CloudFileTable({
  nodes,
  view,
  selectedId,
  loading,
  hasMore,
  loadingMore,
  permissions,
  onSelect,
  onOpenFolder,
  onOpenEditor,
  onToggleStar,
  onDownload,
  onRename,
  onMove,
  onSoftDelete,
  onRestore,
  onPermanentDelete,
  onLoadMore,
}: CloudFileTableProps) {
  if (loading && nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 font-mono text-xs text-[#7D8590]">
        Loading cloud files...
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-medium text-[#E6EDF3]">
          {view === 'TRASH' ? 'Trash is empty' : view === 'STARRED' ? 'No starred items' : 'This folder is empty'}
        </p>
        <p className="mt-1 text-xs text-[#7D8590]">
          {view === 'TRASH'
            ? 'Deleted items stay here for 30 days before automatic purge.'
            : permissions.canWrite
              ? 'Drop files here or use Upload Files / New Folder above.'
              : 'No files or folders match this view.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-[#30363D] bg-[#161B22] font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
          <tr>
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="w-28 px-3 py-2.5 font-medium">Size</th>
            <th className="w-36 px-3 py-2.5 font-medium">{view === 'TRASH' ? 'Auto-Purge' : 'Modified'}</th>
            <th className="w-36 px-3 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#21262D]">
          {nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const isFolder = node.nodeType === 'FOLDER';
            const purgeDays = node.purgeAfter ? daysUntil(node.purgeAfter) : null;

            return (
              <tr
                key={node.id}
                onClick={() => onSelect(node)}
                onDoubleClick={() => {
                  if (view === 'TRASH') return;
                  if (isFolder) {
                    onOpenFolder(node.id);
                  } else if (permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE') {
                    onOpenEditor(node);
                  }
                }}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#052E16]/70 text-[#E6EDF3]' : 'hover:bg-[#161B22]'
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isFolder ? (
                      <Folder className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                    ) : (
                      <File className="h-4 w-4 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
                    )}
                    <span className="truncate font-medium text-[#E6EDF3]">{node.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-[#8B949E]">
                  {isFolder ? '--' : formatBytes(node.sizeBytes)}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-[#8B949E]">
                  {view === 'TRASH' && purgeDays !== null ? `${purgeDays}d left` : formatRelative(node.updatedAt)}
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <CloudRowActions
                    node={node}
                    view={view}
                    permissions={permissions}
                    onOpenEditor={onOpenEditor}
                    onToggleStar={onToggleStar}
                    onDownload={onDownload}
                    onRename={onRename}
                    onMove={onMove}
                    onSoftDelete={onSoftDelete}
                    onRestore={onRestore}
                    onPermanentDelete={onPermanentDelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <div className="flex justify-center border-t border-[#21262D] py-3">
          <Button type="button" variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
