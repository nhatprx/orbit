import { Download, Eye, FilePenLine, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { formatDateTime } from '../../utils/format';
import { formatBytes, nodeTypeLabel } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface FinderColumnPreviewProps {
  node: CloudNodeDto;
  view: CloudView;
  permissions: CloudPermissions;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
}

export function FinderColumnPreview({
  node,
  view,
  permissions,
  onOpenEditor,
  onDownload,
  onRename,
  onMove,
  onSoftDelete,
}: FinderColumnPreviewProps) {
  const canOpen =
    node.nodeType === 'FILE' &&
    permissions.canRead &&
    classifyFileEditor(node.name, node.mimeType) !== 'NONE';

  return (
    <div className="flex w-72 shrink-0 flex-col bg-[#161B22] p-4" data-testid="finder-column-preview">
      <div className="flex flex-col items-center border border-[#30363D] bg-[#0D1117] p-5 text-center">
        <CloudNodeIcon node={node} className="h-10 w-10" />
        <p className="mt-3 break-all text-sm font-semibold text-[#E6EDF3]">{node.name}</p>
        <p className="mt-1 font-mono text-[11px] text-[#7D8590]">
          {nodeTypeLabel(node)} - {formatBytes(node.sizeBytes)}
        </p>
      </div>

      <div className="mt-4 space-y-2 border-t border-[#30363D] pt-3 text-xs">
        {node.folderPath && (
          <div className="flex justify-between gap-2">
            <span className="text-[#7D8590]">Folder</span>
            <span className="truncate font-mono text-[#E6EDF3]">{node.folderPath}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-[#7D8590]">Owner</span>
          <span className="truncate text-[#E6EDF3]">{node.createdByName || node.createdBy}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#7D8590]">Modified</span>
          <span className="font-mono text-[#E6EDF3]">{formatDateTime(node.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {canOpen && (
          <Button type="button" variant="primary" onClick={() => onOpenEditor(node)} className="w-full">
            {permissions.canWrite ? (
              <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {permissions.canWrite ? 'Edit Document' : 'Open Document'}
          </Button>
        )}
        {permissions.canRead && (
          <Button type="button" variant="secondary" onClick={() => onDownload(node)} className="w-full">
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            Download
          </Button>
        )}
        {permissions.canWrite && (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => onRename(node)}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              Rename
            </Button>
            <Button type="button" variant="secondary" onClick={() => onMove(node)}>
              <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
              Move
            </Button>
          </div>
        )}
        {permissions.canDelete && view !== 'TRASH' && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSoftDelete(node)}
            className="w-full border-[#EF4444]/50 text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Move to Trash
          </Button>
        )}
      </div>
    </div>
  );
}
