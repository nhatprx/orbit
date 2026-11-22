import { useState, type DragEvent, type MouseEvent } from 'react';
import { Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { formatBytes, isInternalNodeDrag, nodeTypeLabel, readDraggedNodeIds, writeDraggedNodeIds } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface FinderGridViewProps {
  nodes: CloudNodeDto[];
  view: CloudView;
  selectedIds: string[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  permissions: CloudPermissions;
  onSelect: (node: CloudNodeDto, orderedIds: string[], e: MouseEvent) => void;
  onContextMenu: (node: CloudNodeDto, e: MouseEvent) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDropToFolder: (nodeIds: string[], targetFolderId: string) => void;
  onLoadMore: () => void;
}

export function FinderGridView({
  nodes,
  view,
  selectedIds,
  loading,
  hasMore,
  loadingMore,
  permissions,
  onSelect,
  onContextMenu,
  onOpenFolder,
  onOpenEditor,
  onDropToFolder,
  onLoadMore,
}: FinderGridViewProps) {
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const selectedSet = new Set(selectedIds);
  const orderedIds = nodes.map((n) => n.id);

  if (loading && nodes.length === 0) {
    return <div className="flex flex-1 items-center justify-center p-10 font-mono text-xs text-[#7D8590]">Loading cloud files...</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-medium text-[#E6EDF3]">
          {view === 'TRASH' ? 'Trash is empty' : 'No items in this view'}
        </p>
        <p className="mt-1 text-xs text-[#7D8590]">
          {permissions.canWrite ? 'Drop files here or create a new folder or document.' : 'No files match this filter.'}
        </p>
      </div>
    );
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, node: CloudNodeDto) => {
    if (!permissions.canWrite || view === 'TRASH') return;
    const ids = selectedSet.has(node.id) ? selectedIds : [node.id];
    writeDraggedNodeIds(e.dataTransfer, ids);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, node: CloudNodeDto) => {
    if (node.nodeType !== 'FOLDER' || !permissions.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropFolderId !== node.id) setDropFolderId(node.id);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, node: CloudNodeDto) => {
    if (node.nodeType !== 'FOLDER' || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropFolderId(null);
    const ids = readDraggedNodeIds(e.dataTransfer).filter((id) => id !== node.id);
    if (ids.length > 0) onDropToFolder(ids, node.id);
  };

  return (
    <div className="flex-1 overflow-auto p-4" data-testid="finder-grid-view">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {nodes.map((node) => {
          const isSelected = selectedSet.has(node.id);
          const isFolder = node.nodeType === 'FOLDER';
          const isDropTarget = dropFolderId === node.id;
          return (
            <div
              key={node.id}
              draggable={permissions.canWrite && view !== 'TRASH'}
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDragLeave={() => { if (dropFolderId === node.id) setDropFolderId(null); }}
              onDrop={(e) => handleDrop(e, node)}
              onClick={(e) => onSelect(node, orderedIds, e)}
              onContextMenu={(e) => onContextMenu(node, e)}
              onDoubleClick={() => {
                if (view === 'TRASH') return;
                if (isFolder) onOpenFolder(node.id);
                else if (permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE') onOpenEditor(node);
              }}
              className={`group relative flex cursor-pointer select-none flex-col items-center rounded-none border p-4 text-center transition-colors ${
                isDropTarget
                  ? 'border-[#22C55E] bg-[#052E16]'
                  : isSelected
                    ? 'border-[#22C55E] bg-[#052E16]/75'
                    : 'border-[#30363D] bg-[#161B22] hover:border-[#3B434B] hover:bg-[#1C222B]'
              }`}
            >
              {node.starred && (
                <Star className="absolute right-2 top-2 h-3 w-3 text-[#22C55E]" strokeWidth={1.5} fill="currentColor" />
              )}
              <CloudNodeIcon node={node} className="h-9 w-9 shrink-0" />
              <p className="mt-3 w-full truncate text-xs font-medium text-[#E6EDF3]" title={node.name}>
                {node.name}
              </p>
              <p className="mt-1 w-full truncate font-mono text-[10px] text-[#7D8590]">
                {isFolder ? 'Folder' : `${nodeTypeLabel(node)} - ${formatBytes(node.sizeBytes)}`}
              </p>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
