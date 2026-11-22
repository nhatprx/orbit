import { useState, type DragEvent, type MouseEvent } from 'react';
import { Button } from '../../components/ui/Button';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudPermissions, CloudSortBy, CloudSortDir, CloudView } from '../../types/cloud.types';
import { isFlatCloudView, isInternalNodeDrag, readDraggedNodeIds, writeDraggedNodeIds } from './cloudFormat';
import { CloudFileTableRow } from './CloudFileTableRow';
import { useInlineFolderTree } from './useInlineFolderTree';

interface CloudFileTableProps {
  api: CloudFilesApi;
  nodes: CloudNodeDto[];
  view: CloudView;
  searchQuery?: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  treeResetKey: string;
  selectedIds: string[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  permissions: CloudPermissions;
  showFolderColumn?: boolean;
  allowInlineExpand?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  onSelect: (node: CloudNodeDto, orderedIds: string[], e: MouseEvent) => void;
  onContextMenu: (node: CloudNodeDto, e: MouseEvent) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onDropToFolder?: (nodeIds: string[], targetFolderId: string) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
  onLoadMore: () => void;
}

export function CloudFileTable({
  api, nodes, view, searchQuery = '', sortBy, sortDir, treeResetKey, selectedIds,
  loading, hasMore, loadingMore, permissions, showFolderColumn, allowInlineExpand = true,
  emptyTitle, emptyHint, onSelect, onContextMenu, onOpenFolder, onOpenEditor, onToggleStar,
  onDownload, onRename, onMove, onDropToFolder, onSoftDelete, onRestore, onPermanentDelete, onLoadMore,
}: CloudFileTableProps) {
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const canExpand = allowInlineExpand && view === 'ALL' && !searchQuery.trim();
  const showFolder = showFolderColumn ?? (isFlatCloudView(view) || Boolean(searchQuery.trim()));
  const { rows, expandedIds, loadingIds, toggleExpand } = useInlineFolderTree(api, nodes, canExpand, sortBy, sortDir, treeResetKey);
  const orderedIds = rows.map((r) => r.node.id);
  const selectedSet = new Set(selectedIds);

  if (loading && nodes.length === 0) {
    return <div className="flex flex-1 items-center justify-center p-10 font-mono text-xs text-[#7D8590]">Loading cloud files...</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-medium text-[#E6EDF3]">
          {emptyTitle ?? (view === 'TRASH' ? 'Trash is empty' : view === 'STARRED' ? 'No starred items' : 'This folder is empty')}
        </p>
        <p className="mt-1 text-xs text-[#7D8590]">
          {emptyHint ?? (view === 'TRASH'
            ? 'Deleted items stay here for 30 days before automatic purge.'
            : permissions.canWrite
              ? 'Drop files here or use Upload Files / New Folder above.'
              : 'No files or folders match this view.')}
        </p>
      </div>
    );
  }

  const handleRowDragStart = (e: DragEvent<HTMLTableRowElement>, node: CloudNodeDto) => {
    if (!permissions.canWrite || view === 'TRASH') return;
    writeDraggedNodeIds(e.dataTransfer, selectedSet.has(node.id) ? selectedIds : [node.id]);
  };

  const handleFolderDragOver = (e: DragEvent<HTMLTableRowElement>, node: CloudNodeDto) => {
    if (!onDropToFolder || node.nodeType !== 'FOLDER' || !permissions.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropFolderId !== node.id) setDropFolderId(node.id);
  };

  const handleFolderDrop = (e: DragEvent<HTMLTableRowElement>, node: CloudNodeDto) => {
    if (!onDropToFolder || node.nodeType !== 'FOLDER' || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropFolderId(null);
    const ids = readDraggedNodeIds(e.dataTransfer).filter((id) => id !== node.id);
    if (ids.length > 0) onDropToFolder(ids, node.id);
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-[#30363D] bg-[#161B22] font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            {showFolder && <th className="w-40 px-3 py-2 font-medium">Folder</th>}
            <th className="w-32 px-3 py-2 font-medium">{view === 'TRASH' ? 'Auto-Purge' : 'Date Modified'}</th>
            <th className="w-24 px-3 py-2 font-medium">Size</th>
            <th className="hidden w-32 px-3 py-2 font-medium md:table-cell">Kind</th>
            <th className="w-36 px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#21262D]">
          {rows.map(({ node, indent }, index) => (
            <CloudFileTableRow
              key={node.id}
              node={node}
              indent={indent}
              striped={index % 2 === 1}
              view={view}
              permissions={permissions}
              canExpand={canExpand}
              isExpanded={expandedIds.has(node.id)}
              isLoadingChildren={loadingIds.has(node.id)}
              isSelected={selectedSet.has(node.id)}
              isDropTarget={dropFolderId === node.id}
              showFolder={showFolder}
              onToggleExpand={toggleExpand}
              onSelect={(e) => onSelect(node, orderedIds, e)}
              onContextMenu={(e) => onContextMenu(node, e)}
              onOpenFolder={onOpenFolder}
              onOpenEditor={onOpenEditor}
              onToggleStar={onToggleStar}
              onDownload={onDownload}
              onRename={onRename}
              onMove={onMove}
              onSoftDelete={onSoftDelete}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              onDragStart={(e) => handleRowDragStart(e, node)}
              onDragOver={(e) => handleFolderDragOver(e, node)}
              onDragLeave={() => { if (dropFolderId === node.id) setDropFolderId(null); }}
              onDrop={(e) => handleFolderDrop(e, node)}
            />
          ))}
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
