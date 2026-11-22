import { useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../types/cloud.types';
import { isInternalNodeDrag } from './cloudFormat';
import { CloudTextEditorModal } from './editor/CloudTextEditorModal';
import { classifyFileEditor } from './editor/fileEditorRegistry';
import { OrbitOfficeWorkspace } from './editor/office/OrbitOfficeWorkspace';

export function useExternalFileDrop(
  enabled: boolean,
  onDropFiles: (files: File[]) => void
) {
  const [dragActive, setDragActive] = useState(false);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!enabled || isInternalNodeDrag(e.dataTransfer)) return;
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (enabled && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragActive(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!enabled || isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) onDropFiles(dropped);
  };

  return { dragActive, dragHandlers: { onDragOver, onDragLeave, onDrop } };
}

export function CloudDropOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-[#22C55E] bg-[#052E16]/80">
      <div className="flex flex-col items-center gap-2 border border-[#22C55E] bg-[#0D1117] px-8 py-6">
        <Upload className="h-7 w-7 text-[#22C55E]" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-[#E6EDF3]">Drop files to upload</p>
        <p className="font-mono text-xs text-[#8B949E]">Direct upload to Orbit Cloud Storage</p>
      </div>
    </div>
  );
}

interface CloudEditorSurfaceProps {
  api: CloudFilesApi;
  canWrite: boolean;
  canManage: boolean;
  textNode: CloudNodeDto | null;
  officeNode: CloudNodeDto | null;
  onCloseText: () => void;
  onCloseOffice: () => void;
  onDownload: (node: CloudNodeDto) => void;
  onSaved: (node: CloudNodeDto) => void;
}

export function CloudEditorSurface({
  api,
  canWrite,
  canManage,
  textNode,
  officeNode,
  onCloseText,
  onCloseOffice,
  onDownload,
  onSaved,
}: CloudEditorSurfaceProps) {
  if (textNode) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <CloudTextEditorModal
          node={textNode}
          api={api}
          canWrite={canWrite}
          canManage={canManage}
          onClose={onCloseText}
          onSaved={onSaved}
        />
      </div>
    );
  }
  if (officeNode) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <OrbitOfficeWorkspace
          node={officeNode}
          api={api}
          canWrite={canWrite}
          canManage={canManage}
          isPdf={classifyFileEditor(officeNode.name, officeNode.mimeType) === 'PDF'}
          onBack={onCloseOffice}
          onDownload={onDownload}
          onSaved={onSaved}
        />
      </div>
    );
  }
  return null;
}
