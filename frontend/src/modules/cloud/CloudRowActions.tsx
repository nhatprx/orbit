import {
  Download,
  Eye,
  FilePenLine,
  FolderInput,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface CloudRowActionsProps {
  node: CloudNodeDto;
  view: CloudView;
  permissions: CloudPermissions;
  onOpenEditor: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
}

const ACTION_BTN =
  'flex h-6 w-6 items-center justify-center border border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';

export function CloudRowActions({
  node,
  view,
  permissions,
  onOpenEditor,
  onToggleStar,
  onDownload,
  onRename,
  onMove,
  onSoftDelete,
  onRestore,
  onPermanentDelete,
}: CloudRowActionsProps) {
  const isFolder = node.nodeType === 'FOLDER';
  const canOpenEditor = !isFolder && permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE';

  if (view === 'TRASH') {
    return (
      <div className="flex items-center justify-end gap-0.5">
        {(permissions.canWrite || permissions.canDelete) && (
          <button
            type="button"
            title="Restore"
            aria-label={`Restore ${node.name}`}
            onClick={() => onRestore(node)}
            className={`${ACTION_BTN} hover:text-[#22C55E]`}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
        {permissions.canManage && (
          <button
            type="button"
            title="Delete Forever"
            aria-label={`Permanently delete ${node.name}`}
            onClick={() => onPermanentDelete(node)}
            className={`${ACTION_BTN} hover:text-[#EF4444]`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canOpenEditor && (
        <button
          type="button"
          title={permissions.canWrite ? 'Edit' : 'Open'}
          aria-label={`${permissions.canWrite ? 'Edit' : 'Open'} ${node.name}`}
          onClick={() => onOpenEditor(node)}
          className={`${ACTION_BTN} hover:text-[#22C55E]`}
        >
          {permissions.canWrite ? (
            <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      )}
      {permissions.canWrite && (
        <button
          type="button"
          title={node.starred ? 'Unstar' : 'Star'}
          aria-label={node.starred ? `Unstar ${node.name}` : `Star ${node.name}`}
          onClick={() => onToggleStar(node)}
          className={`${ACTION_BTN} ${node.starred ? 'text-[#22C55E]' : ''}`}
        >
          <Star className="h-3.5 w-3.5" strokeWidth={1.5} fill={node.starred ? 'currentColor' : 'none'} />
        </button>
      )}
      {!isFolder && permissions.canRead && (
        <button
          type="button"
          title="Download"
          aria-label={`Download ${node.name}`}
          onClick={() => onDownload(node)}
          className={ACTION_BTN}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
      {permissions.canWrite && (
        <>
          <button
            type="button"
            title="Rename"
            aria-label={`Rename ${node.name}`}
            onClick={() => onRename(node)}
            className={ACTION_BTN}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            title="Move"
            aria-label={`Move ${node.name}`}
            onClick={() => onMove(node)}
            className={ACTION_BTN}
          >
            <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </>
      )}
      {permissions.canDelete && (
        <button
          type="button"
          title="Move to Trash"
          aria-label={`Delete ${node.name}`}
          onClick={() => onSoftDelete(node)}
          className={`${ACTION_BTN} hover:text-[#EF4444]`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
