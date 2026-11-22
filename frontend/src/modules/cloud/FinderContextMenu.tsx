import { useEffect, useRef } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FolderInput,
  Lock,
  LockOpen,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import { isCloudNodeLocked, type CloudNodeDto, type CloudPermissions, type CloudView } from '../../types/cloud.types';
import { classifyFileEditor } from './editor/fileEditorRegistry';

export interface ContextMenuState {
  x: number;
  y: number;
  targetNode: CloudNodeDto;
  selectedNodes: CloudNodeDto[];
}

interface FinderContextMenuProps {
  menu: ContextMenuState | null;
  view: CloudView;
  permissions: CloudPermissions;
  onClose: () => void;
  onQuickLook: (node: CloudNodeDto) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMoveNodes: (nodes: CloudNodeDto[]) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onToggleLock?: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onSoftDeleteNodes: (nodes: CloudNodeDto[]) => void;
  onRestoreNodes: (nodes: CloudNodeDto[]) => void;
  onPermanentDeleteNodes: (nodes: CloudNodeDto[]) => void;
}

const ITEM_CLS =
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-[#E6EDF3] hover:bg-[#052E16] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-40';
const DANGER_CLS =
  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-[#EF4444] hover:bg-[#EF4444]/15 disabled:cursor-not-allowed disabled:opacity-40';

export function FinderContextMenu({
  menu, view, permissions, onClose, onQuickLook, onOpenFolder, onOpenEditor,
  onRename, onMoveNodes, onToggleStar, onToggleLock, onDownload,
  onSoftDeleteNodes, onRestoreNodes, onPermanentDeleteNodes,
}: FinderContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const { targetNode, selectedNodes } = menu;
  const batch = selectedNodes.length > 1 ? selectedNodes : [targetNode];
  const isBatch = batch.length > 1;
  const isFolder = targetNode.nodeType === 'FOLDER';
  const targetLocked = isCloudNodeLocked(targetNode);
  const anyLocked = batch.some((n) => isCloudNodeLocked(n));
  const canOpenFile = !isFolder && permissions.canRead && classifyFileEditor(targetNode.name, targetNode.mimeType) !== 'NONE';
  const left = Math.min(menu.x, Math.max(8, window.innerWidth - 220));
  const top = Math.min(menu.y, Math.max(8, window.innerHeight - 280));

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="File actions"
      style={{ left, top }}
      className="fixed z-50 w-52 rounded-none border border-[#3B434B] bg-[#161B22] py-1 shadow-xl"
    >
      {view === 'TRASH' ? (
        <>
          {(permissions.canWrite || permissions.canDelete) && (
            <button type="button" role="menuitem" onClick={() => run(() => onRestoreNodes(batch))} className={ITEM_CLS}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{isBatch ? `Restore ${batch.length} items` : 'Restore'}</span>
            </button>
          )}
          {permissions.canManage && (
            <button type="button" role="menuitem" onClick={() => run(() => onPermanentDeleteNodes(batch))} className={DANGER_CLS}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{isBatch ? `Delete ${batch.length} permanently` : 'Delete Permanently'}</span>
            </button>
          )}
        </>
      ) : (
        <>
          {!isBatch && !isFolder && permissions.canRead && (
            <button type="button" role="menuitem" onClick={() => run(() => onQuickLook(targetNode))} className={ITEM_CLS}>
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Quick Look</span>
            </button>
          )}
          {!isBatch && (isFolder || canOpenFile) && (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(() => (isFolder ? onOpenFolder(targetNode.id) : onOpenEditor(targetNode)))}
              className={ITEM_CLS}
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Open</span>
            </button>
          )}
          {!isBatch && (targetNode.canToggleLock ?? permissions.canManage) && onToggleLock && (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(() => onToggleLock(targetNode))}
              className={ITEM_CLS}
            >
              {targetLocked ? <LockOpen className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />}
              <span>{targetLocked ? 'Unlock' : 'Lock'}</span>
            </button>
          )}
          {!isBatch && permissions.canWrite && (
            <button type="button" role="menuitem" disabled={targetLocked} onClick={() => run(() => onRename(targetNode))} className={ITEM_CLS}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Rename</span>
            </button>
          )}
          {permissions.canWrite && (
            <button type="button" role="menuitem" disabled={anyLocked} onClick={() => run(() => onMoveNodes(batch))} className={ITEM_CLS}>
              <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{isBatch ? `Move ${batch.length} items...` : 'Move to Folder...'}</span>
            </button>
          )}
          {!isBatch && permissions.canWrite && (
            <button type="button" role="menuitem" onClick={() => run(() => onToggleStar(targetNode))} className={ITEM_CLS}>
              <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{targetNode.starred ? 'Unstar' : 'Star'}</span>
            </button>
          )}
          {!isBatch && !isFolder && permissions.canRead && (
            <button type="button" role="menuitem" onClick={() => run(() => onDownload(targetNode))} className={ITEM_CLS}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Download</span>
            </button>
          )}
          {permissions.canDelete && (
            <>
              <div className="my-1 border-t border-[#30363D]" />
              <button type="button" role="menuitem" disabled={anyLocked} onClick={() => run(() => onSoftDeleteNodes(batch))} className={DANGER_CLS}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{isBatch ? `Move ${batch.length} to Trash` : 'Move to Trash'}</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
