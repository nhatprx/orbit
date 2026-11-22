import { Download, Eye, FolderInput, RotateCcw, Trash2, X } from 'lucide-react';
import { isCloudNodeLocked, type CloudNodeDto, type CloudPermissions, type CloudView } from '../../types/cloud.types';

interface FinderSelectionBarProps {
  selectedNodes: CloudNodeDto[];
  view: CloudView;
  permissions: CloudPermissions;
  onQuickLook?: (node: CloudNodeDto) => void;
  onMoveSelected: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onRestoreSelected: () => void;
  onPermanentDeleteSelected: () => void;
  onClear: () => void;
}

const BTN =
  'inline-flex items-center gap-1.5 rounded-none border border-[#30363D] bg-[#161B22] px-2.5 py-1 text-xs text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]';

export function FinderSelectionBar({
  selectedNodes,
  view,
  permissions,
  onQuickLook,
  onMoveSelected,
  onDownloadSelected,
  onDeleteSelected,
  onRestoreSelected,
  onPermanentDeleteSelected,
  onClear,
}: FinderSelectionBarProps) {
  if (selectedNodes.length === 0) return null;

  const hasFiles = selectedNodes.some((n) => n.nodeType === 'FILE');
  const anyLocked = selectedNodes.some((n) => isCloudNodeLocked(n));
  const firstSelected = selectedNodes[0];
  const singleFile = selectedNodes.length === 1 && firstSelected?.nodeType === 'FILE' ? firstSelected : null;

  return (
    <div
      role="region"
      aria-label="Selection actions"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22C55E]/40 bg-[#052E16]/60 px-4 py-1.5 text-xs"
    >
      <span className="font-mono text-xs font-medium text-[#22C55E]">
        {selectedNodes.length} selected
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {view !== 'TRASH' ? (
          <>
            {singleFile && onQuickLook && permissions.canRead && (
              <button type="button" onClick={() => onQuickLook(singleFile)} className={BTN}>
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                Quick Look
              </button>
            )}
            {permissions.canWrite && (
              <button type="button" disabled={anyLocked} onClick={onMoveSelected} className={`${BTN} disabled:cursor-not-allowed disabled:opacity-40`}>
                <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
                Move to Folder
              </button>
            )}
            {hasFiles && permissions.canRead && (
              <button type="button" onClick={onDownloadSelected} className={BTN}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                Download
              </button>
            )}
            {permissions.canDelete && (
              <button
                type="button"
                disabled={anyLocked}
                onClick={onDeleteSelected}
                className="inline-flex items-center gap-1.5 rounded-none border border-[#EF4444]/50 bg-[#161B22] px-2.5 py-1 text-xs text-[#EF4444] hover:border-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Move to Trash
              </button>
            )}
          </>
        ) : (
          <>
            {(permissions.canWrite || permissions.canDelete) && (
              <button type="button" onClick={onRestoreSelected} className={BTN}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Restore
              </button>
            )}
            {permissions.canManage && (
              <button
                type="button"
                onClick={onPermanentDeleteSelected}
                className="inline-flex items-center gap-1.5 rounded-none border border-[#EF4444]/50 bg-[#161B22] px-2.5 py-1 text-xs text-[#EF4444] hover:border-[#EF4444]"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Delete Permanently
              </button>
            )}
          </>
        )}

        <button type="button" onClick={onClear} className={BTN}>
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          Clear
        </button>
      </div>
    </div>
  );
}
