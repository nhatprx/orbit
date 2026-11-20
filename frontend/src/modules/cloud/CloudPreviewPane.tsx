import {
  Download,
  Eye,
  File,
  FilePenLine,
  Folder,
  FolderInput,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudNodeDto, CloudPermissions, CloudView } from '../../types/cloud.types';
import { daysUntil, formatDateTime } from '../../utils/format';
import { formatBytes, nodeTypeLabel, scopeTypeLabel } from './cloudFormat';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface CloudPreviewPaneProps {
  node: CloudNodeDto | null;
  view: CloudView;
  permissions: CloudPermissions;
  onClose: () => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#21262D] py-2 text-xs">
      <span className="shrink-0 text-[#7D8590]">{label}</span>
      <span className={`truncate text-right text-[#E6EDF3] ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export function CloudPreviewPane({
  node,
  view,
  permissions,
  onClose,
  onOpenEditor,
  onDownload,
  onToggleStar,
  onRename,
  onMove,
  onSoftDelete,
  onRestore,
  onPermanentDelete,
}: CloudPreviewPaneProps) {
  if (!node) return null;

  const isFolder = node.nodeType === 'FOLDER';
  const canOpenEditor = !isFolder && permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE';
  const purgeDays = node.purgeAfter ? daysUntil(node.purgeAfter) : null;

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22] lg:flex">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">Inspector</span>
        <button
          type="button"
          aria-label="Close inspector"
          onClick={onClose}
          className="text-[#8B949E] hover:text-[#E6EDF3]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-2.5 border border-[#30363D] bg-[#0D1117] p-3">
          {isFolder ? (
            <Folder className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          ) : (
            <File className="mt-0.5 h-5 w-5 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
          )}
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold text-[#E6EDF3]">{node.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[#7D8590]">{nodeTypeLabel(node)}</p>
          </div>
        </div>

        <div className="mt-4">
          <MetaRow label="Storage Layer" value={scopeTypeLabel(node.scopeType)} />
          <MetaRow label="Type" value={isFolder ? 'Folder' : (node.mimeType ?? 'application/octet-stream')} mono />
          <MetaRow label="Size" value={isFolder ? '--' : formatBytes(node.sizeBytes)} mono />
          <MetaRow label="Owner" value={node.createdByName || node.createdBy} />
          <MetaRow label="Created" value={formatDateTime(node.createdAt)} mono />
          <MetaRow label="Modified" value={formatDateTime(node.updatedAt)} mono />
          {node.purgeAfter && (
            <MetaRow
              label="Auto-Purge"
              value={`${formatDateTime(node.purgeAfter)} (${purgeDays ?? 0}d)`}
              mono
            />
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {view !== 'TRASH' ? (
            <>
              {canOpenEditor && (
                <Button type="button" variant="primary" onClick={() => onOpenEditor(node)} className="w-full">
                  {permissions.canWrite ? (
                    <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {permissions.canWrite ? 'Edit Document' : 'Open Document'}
                </Button>
              )}
              {!isFolder && permissions.canRead && (
                <Button type="button" variant={canOpenEditor ? 'secondary' : 'primary'} onClick={() => onDownload(node)} className="w-full">
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Download
                </Button>
              )}
              {permissions.canWrite && (
                <>
                  <Button type="button" variant="secondary" onClick={() => onToggleStar(node)} className="w-full">
                    <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {node.starred ? 'Remove Star' : 'Add Star'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onRename(node)} className="w-full">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Rename
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onMove(node)} className="w-full">
                    <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Move to Folder
                  </Button>
                </>
              )}
              {permissions.canDelete && (
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
            </>
          ) : (
            <>
              {(permissions.canWrite || permissions.canDelete) && (
                <Button type="button" variant="primary" onClick={() => onRestore(node)} className="w-full">
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Restore
                </Button>
              )}
              {permissions.canManage && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onPermanentDelete(node)}
                  className="w-full border-[#EF4444]/50 text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Delete Forever
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
