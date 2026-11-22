import type { DragEvent, MouseEvent } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { daysUntil, formatRelative } from '../../utils/format';
import { formatBytes, nodeTypeLabel } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { CloudRowActions } from './CloudRowActions';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface CloudFileTableRowProps {
  node: CloudNodeDto;
  indent: number;
  striped: boolean;
  view: CloudView;
  permissions: CloudPermissions;
  canExpand: boolean;
  isExpanded: boolean;
  isLoadingChildren: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  showFolder: boolean;
  onToggleExpand: (folderId: string) => void;
  onSelect: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
  onDragStart: (e: DragEvent<HTMLTableRowElement>) => void;
  onDragOver: (e: DragEvent<HTMLTableRowElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLTableRowElement>) => void;
}

export function CloudFileTableRow({
  node, indent, striped, view, permissions, canExpand, isExpanded, isLoadingChildren,
  isSelected, isDropTarget, showFolder, onToggleExpand, onSelect, onContextMenu,
  onOpenFolder, onOpenEditor, onToggleStar, onDownload, onRename, onMove,
  onSoftDelete, onRestore, onPermanentDelete, onDragStart, onDragOver, onDragLeave, onDrop,
}: CloudFileTableRowProps) {
  const isFolder = node.nodeType === 'FOLDER';
  const purgeDays = node.purgeAfter ? daysUntil(node.purgeAfter) : null;
  const rowBg = isDropTarget
    ? 'bg-[#052E16] outline outline-1 outline-[#22C55E]'
    : isSelected
      ? 'bg-[#052E16]/75 text-[#E6EDF3]'
      : striped
        ? 'bg-[#12171E] hover:bg-[#1B222C]'
        : 'bg-[#0D1117] hover:bg-[#1B222C]';

  return (
    <tr
      draggable={permissions.canWrite && view !== 'TRASH'}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={() => {
        if (view === 'TRASH') return;
        if (isFolder) onOpenFolder(node.id);
        else if (permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE') {
          onOpenEditor(node);
        }
      }}
      className={`cursor-pointer select-none transition-colors ${rowBg}`}
    >
      <td className="px-4 py-2">
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${indent * 20}px` }}>
          {canExpand ? (
            isFolder ? (
              <button
                type="button"
                aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
                className="flex h-4 w-4 shrink-0 items-center justify-center text-[#7D8590] hover:text-[#22C55E]"
              >
                {isLoadingChildren ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )
          ) : null}
          <CloudNodeIcon node={node} />
          <span className="truncate font-medium text-[#E6EDF3]">{node.name}</span>
        </div>
      </td>
      {showFolder && (
        <td className="max-w-40 truncate px-3 py-2 font-mono text-xs text-[#7D8590]">
          {node.folderPath || '/'}
        </td>
      )}
      <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">
        {view === 'TRASH' && purgeDays !== null ? `${purgeDays}d left` : formatRelative(node.updatedAt)}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-[#8B949E]">
        {isFolder ? '--' : formatBytes(node.sizeBytes)}
      </td>
      <td className="hidden px-3 py-2 text-xs text-[#7D8590] md:table-cell">{nodeTypeLabel(node)}</td>
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <CloudRowActions
          node={node} view={view} permissions={permissions}
          onOpenEditor={onOpenEditor} onToggleStar={onToggleStar} onDownload={onDownload}
          onRename={onRename} onMove={onMove} onSoftDelete={onSoftDelete}
          onRestore={onRestore} onPermanentDelete={onPermanentDelete}
        />
      </td>
    </tr>
  );
}
