import {
  Download, Eye, FilePenLine, FolderInput, Lock, LockOpen, Pencil, RotateCcw, Star, Trash2, X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { isCloudNodeLocked, type CloudNodeDto, type CloudPermissions, type CloudView } from '../../types/cloud.types';
import { daysUntil, formatDateTime } from '../../utils/format';
import { formatBytes, humanFileKind, scopeTypeLabel } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { classifyFileEditor } from './editor/fileEditorRegistry';

interface CloudPreviewPaneProps {
  node: CloudNodeDto | null;
  view: CloudView;
  permissions: CloudPermissions;
  onClose: () => void;
  onQuickLook: (node: CloudNodeDto) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onToggleLock?: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
}

const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-none border border-[#30363D] bg-[#0D1117] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-35';
const DANGER_ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-none border border-[#EF4444]/40 bg-[#0D1117] text-[#EF4444] transition-colors hover:border-[#EF4444] hover:bg-[#EF4444]/10 disabled:cursor-not-allowed disabled:opacity-35';

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 overflow-hidden border-b border-[#21262D] py-1.5 text-xs">
      <span className="shrink-0 text-[#7D8590]">{label}</span>
      <span title={value} className={`min-w-0 truncate text-right text-[#E6EDF3] ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function CloudPreviewPane({
  node, view, permissions, onClose, onQuickLook, onOpenEditor, onDownload,
  onToggleStar, onToggleLock, onRename, onMove, onSoftDelete, onRestore, onPermanentDelete,
}: CloudPreviewPaneProps) {
  if (!node) {
    return (
      <aside data-testid="cloud-inspector-pane" className="flex w-64 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-[#30363D] px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">Inspector</span>
          <button type="button" aria-label="Close inspector" onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3]">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-[#7D8590]">
          Select an item to inspect its details.
        </div>
      </aside>
    );
  }

  const isFolder = node.nodeType === 'FOLDER';
  const locked = isCloudNodeLocked(node);
  const effectiveCanWrite = permissions.canWrite && !locked;
  const kindLabel = humanFileKind(node);
  const canOpenEditor = !isFolder && permissions.canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE';
  const purgeDays = node.purgeAfter ? daysUntil(node.purgeAfter) : null;

  return (
    <aside data-testid="cloud-inspector-pane" className="flex w-64 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22]">
      <div className="flex items-center justify-between border-b border-[#30363D] px-3 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#7D8590]">Inspector</span>
        <button type="button" aria-label="Close inspector" onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3]">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex min-w-0 items-start gap-2.5 overflow-hidden border border-[#30363D] bg-[#0D1117] p-2.5">
          <CloudNodeIcon node={node} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p title={node.name} className="truncate text-xs font-semibold text-[#E6EDF3]">{node.name}</p>
              {locked && (
                <span data-testid="inspector-locked-badge" className="inline-flex shrink-0 items-center gap-0.5 border border-[#EAB308]/60 bg-[#EAB308]/10 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#EAB308]">
                  <Lock className="h-2.5 w-2.5" strokeWidth={1.5} />
                  LOCKED
                </span>
              )}
            </div>
            <p title={kindLabel} className="mt-0.5 truncate font-mono text-[10px] text-[#7D8590]">{kindLabel}</p>
          </div>
        </div>

        <div className="mt-3">
          <MetaRow label="Storage" value={scopeTypeLabel(node.scopeType)} />
          {node.folderPath && <MetaRow label="Folder" value={node.folderPath} mono />}
          <MetaRow label="Kind" value={kindLabel} />
          <MetaRow label="Size" value={isFolder ? '--' : formatBytes(node.sizeBytes)} mono />
          <MetaRow label="Owner" value={node.createdByName || node.createdBy} />
          <MetaRow label="Created" value={formatDateTime(node.createdAt)} mono />
          <MetaRow label="Modified" value={formatDateTime(node.updatedAt)} mono />
          {node.purgeAfter && <MetaRow label="Auto-Purge" value={`${formatDateTime(node.purgeAfter)} (${purgeDays ?? 0}d)`} mono />}
        </div>

        <div className="mt-4 space-y-2">
          {view !== 'TRASH' ? (
            <>
              {canOpenEditor ? (
                <Button type="button" variant="primary" onClick={() => onOpenEditor(node)} className="w-full py-1.5 text-xs">
                  {effectiveCanWrite ? <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  {effectiveCanWrite ? 'Edit Document' : 'Open'}
                </Button>
              ) : !isFolder && permissions.canRead ? (
                <Button type="button" variant="primary" onClick={() => onQuickLook(node)} className="w-full py-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Quick Look
                </Button>
              ) : null}

              <div role="toolbar" aria-label="Inspector actions" className="flex flex-wrap items-center gap-1">
                {!isFolder && permissions.canRead && (
                  <>
                    <button type="button" title="Quick Look" aria-label="Quick Look" onClick={() => onQuickLook(node)} className={ICON_BTN}>
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button type="button" title="Download" aria-label="Download" onClick={() => onDownload(node)} className={ICON_BTN}>
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </>
                )}
                {(node.canToggleLock ?? permissions.canManage) && onToggleLock && (
                  <button
                    type="button"
                    title={locked ? 'Unlock' : 'Lock'}
                    aria-label={locked ? 'Unlock' : 'Lock'}
                    onClick={() => onToggleLock(node)}
                    className={`${ICON_BTN} ${locked ? 'border-[#EAB308] text-[#EAB308]' : ''}`}
                  >
                    {locked ? <LockOpen className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </button>
                )}
                {permissions.canWrite && (
                  <>
                    <button
                      type="button"
                      title={node.starred ? 'Remove Star' : 'Star'}
                      aria-label={node.starred ? 'Remove Star' : 'Star'}
                      onClick={() => onToggleStar(node)}
                      className={`${ICON_BTN} ${node.starred ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : ''}`}
                    >
                      <Star className="h-3.5 w-3.5" strokeWidth={1.5} fill={node.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" disabled={locked} title="Rename" aria-label="Rename" onClick={() => onRename(node)} className={ICON_BTN}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button type="button" disabled={locked} title="Move to Folder" aria-label="Move" onClick={() => onMove(node)} className={ICON_BTN}>
                      <FolderInput className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </>
                )}
                {permissions.canDelete && (
                  <button type="button" disabled={locked} title="Move to Trash" aria-label="Trash" onClick={() => onSoftDelete(node)} className={DANGER_ICON_BTN}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              {(permissions.canWrite || permissions.canDelete) && (
                <Button type="button" variant="primary" onClick={() => onRestore(node)} className="flex-1 py-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Restore
                </Button>
              )}
              {permissions.canManage && (
                <button type="button" title="Delete Forever" aria-label="Delete Forever" onClick={() => onPermanentDelete(node)} className={DANGER_ICON_BTN}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
