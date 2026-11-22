import { useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudPermissions, CloudSortBy, CloudSortDir, CloudView } from '../../types/cloud.types';
import { isInternalNodeDrag, readDraggedNodeIds, writeDraggedNodeIds } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { classifyFileEditor } from './editor/fileEditorRegistry';
import { FinderColumnPreview } from './FinderColumnPreview';

interface ColumnState {
  folderId: string;
  items: CloudNodeDto[];
  loading: boolean;
}

interface FinderColumnsViewProps {
  api: CloudFilesApi;
  rootNodes: CloudNodeDto[];
  view: CloudView;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  resetKey: string;
  selectedIds: string[];
  loading: boolean;
  permissions: CloudPermissions;
  onSelect: (node: CloudNodeDto, orderedIds: string[], e: MouseEvent) => void;
  onContextMenu: (node: CloudNodeDto, e: MouseEvent) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onDropToFolder: (nodeIds: string[], targetFolderId: string) => void;
}

export function FinderColumnsView({
  api, rootNodes, view, sortBy, sortDir, resetKey, selectedIds, loading, permissions,
  onSelect, onContextMenu, onOpenEditor, onDownload, onRename, onMove, onSoftDelete, onDropToFolder,
}: FinderColumnsViewProps) {
  const [columns, setColumns] = useState<ColumnState[]>([]);
  const [activePath, setActivePath] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<CloudNodeDto | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const selectedSet = new Set(selectedIds);

  useEffect(() => {
    setColumns([]);
    setActivePath([]);
    setPreviewFile(null);
  }, [resetKey, sortBy, sortDir]);

  if (loading && rootNodes.length === 0) {
    return <div className="flex flex-1 items-center justify-center p-10 font-mono text-xs text-[#7D8590]">Loading cloud files...</div>;
  }

  const handleItemClick = (colIndex: number, node: CloudNodeDto, siblings: CloudNodeDto[], e: MouseEvent) => {
    onSelect(node, siblings.map((s) => s.id), e);
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    setActivePath([...activePath.slice(0, colIndex), node.id]);

    if (node.nodeType === 'FOLDER' && view !== 'TRASH') {
      setPreviewFile(null);
      setColumns([...columns.slice(0, colIndex), { folderId: node.id, items: [], loading: true }]);
      api
        .listNodes({ parentId: node.id, view: 'ALL', sortBy, sortDir, limit: 100 })
        .then((page) => {
          setColumns((prev) =>
            prev.map((c) => (c.folderId === node.id ? { ...c, items: page.items, loading: false } : c))
          );
        })
        .catch(() => {
          setColumns((prev) => prev.map((c) => (c.folderId === node.id ? { ...c, loading: false } : c)));
        });
    } else {
      setColumns((prev) => prev.slice(0, colIndex));
      setPreviewFile(node);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, node: CloudNodeDto) => {
    if (!permissions.canWrite || view === 'TRASH') return;
    writeDraggedNodeIds(e.dataTransfer, selectedSet.has(node.id) ? selectedIds : [node.id]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, folderId: string) => {
    if (!permissions.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropFolderId(null);
    const ids = readDraggedNodeIds(e.dataTransfer).filter((id) => id !== folderId);
    if (ids.length > 0) onDropToFolder(ids, folderId);
  };

  const allCols = [
    { key: 'root', items: rootNodes, loading: false },
    ...columns.map((c) => ({ key: c.folderId, items: c.items, loading: c.loading })),
  ];

  return (
    <div className="flex flex-1 overflow-x-auto divide-x divide-[#30363D] bg-[#0D1117]" data-testid="finder-columns-view">
      {allCols.map((col, colIndex) => (
        <div key={col.key} className="flex w-60 shrink-0 flex-col overflow-y-auto bg-[#0D1117]">
          {col.loading ? (
            <p className="p-4 font-mono text-xs text-[#7D8590]">Loading...</p>
          ) : col.items.length === 0 ? (
            <p className="p-4 text-xs text-[#7D8590]">Empty folder</p>
          ) : (
            col.items.map((node) => {
              const isFolder = node.nodeType === 'FOLDER';
              const isActive = activePath[colIndex] === node.id || selectedSet.has(node.id);
              const isDropTarget = dropFolderId === node.id;
              return (
                <div
                  key={node.id}
                  draggable={permissions.canWrite && view !== 'TRASH'}
                  onDragStart={(e) => handleDragStart(e, node)}
                  onDragOver={(e) => {
                    if (!isFolder || !permissions.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (dropFolderId !== node.id) setDropFolderId(node.id);
                  }}
                  onDragLeave={() => { if (dropFolderId === node.id) setDropFolderId(null); }}
                  onDrop={(e) => { if (isFolder) handleDrop(e, node.id); }}
                  onClick={(e) => handleItemClick(colIndex, node, col.items, e)}
                  onContextMenu={(e) => onContextMenu(node, e)}
                  onDoubleClick={() => {
                    if (view !== 'TRASH' && !isFolder && permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE') {
                      onOpenEditor(node);
                    }
                  }}
                  className={`flex cursor-pointer select-none items-center justify-between gap-2 border-b border-[#21262D] px-3 py-2 text-xs ${
                    isDropTarget
                      ? 'bg-[#052E16] text-[#22C55E] outline outline-1 outline-[#22C55E]'
                      : isActive
                        ? 'bg-[#052E16] text-[#22C55E]'
                        : 'text-[#E6EDF3] hover:bg-[#161B22]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CloudNodeIcon node={node} />
                    <span className="truncate font-medium">{node.name}</span>
                  </span>
                  {isFolder && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#7D8590]" strokeWidth={1.5} />}
                </div>
              );
            })
          )}
        </div>
      ))}

      {previewFile && (
        <FinderColumnPreview
          node={previewFile}
          view={view}
          permissions={permissions}
          onOpenEditor={onOpenEditor}
          onDownload={onDownload}
          onRename={onRename}
          onMove={onMove}
          onSoftDelete={onSoftDelete}
        />
      )}
    </div>
  );
}
