import type { ReactNode } from 'react';
import { AlertCircle, ArrowLeft, Check, Download, FileSpreadsheet, FileText, Lock, Presentation, Save, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import type { CollabParticipant } from '../../../../types/collab.types';
import { CollabPresenceBar } from '../../../collab/CollabPresenceBar';
import { formatBytes } from '../../cloudFormat';
import type { OfficeFormat } from './officeTypes';

export interface OrbitOfficeHeaderProps {
  node: CloudNodeDto;
  format: OfficeFormat;
  pdfMode: boolean;
  canWrite: boolean;
  locked?: boolean;
  canToggleLock?: boolean;
  lockPending?: boolean;
  participants?: readonly CollabParticipant[];
  activeHint?: string | null;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  savedNotice: boolean;
  error: string | null;
  confirmDiscard: boolean;
  menuBar?: ReactNode;
  onExportCsv?: () => void;
  onToggleLock?: () => void;
  onRequestBack: () => void;
  onDownload: () => void;
  onSave: (closeAfter: boolean) => void;
  onDismissError: () => void;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function OrbitOfficeHeader({
  node, format, pdfMode, canWrite, locked = false, canToggleLock = false, lockPending = false,
  participants = [], activeHint, dirty, saving, loading, savedNotice, error, confirmDiscard, menuBar,
  onExportCsv, onToggleLock, onRequestBack, onDownload, onSave, onDismissError, onKeepEditing, onDiscard,
}: OrbitOfficeHeaderProps) {
  const statusLabel = pdfMode || !canWrite ? 'Read-Only' : dirty ? 'Unsaved' : 'Saved';
  const dotColor = pdfMode || !canWrite ? 'bg-[#8B949E]' : dirty ? 'bg-[#22C55E]' : 'bg-[#30363D]';
  const formatBadge = pdfMode ? 'PDF VIEWER' : format === 'XLSX' ? 'ORBIT SHEETS' : format === 'PPTX' ? 'ORBIT SLIDES' : 'ORBIT DOCS';
  const FormatIcon = pdfMode ? FileText : format === 'XLSX' ? FileSpreadsheet : format === 'PPTX' ? Presentation : FileText;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            aria-label="Back to files"
            title="Back to files"
            onClick={onRequestBack}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-[#30363D] bg-[#21262D] text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E] focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <FormatIcon className="h-5 w-5 shrink-0 text-[#22C55E]" strokeWidth={1.5} aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="border border-[#22C55E]/40 bg-[#052E16] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]">
                {formatBadge}
              </span>
              <span className="truncate text-sm font-semibold text-[#E6EDF3]">{node.name}</span>
              <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] text-[#8B949E]">
                {formatBytes(node.sizeBytes)}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">
                <span className={`inline-block h-1.5 w-1.5 rounded-none ${dotColor}`} aria-hidden="true" />
                {statusLabel}
              </span>
              {savedNotice && !dirty && (
                <span role="status" className="inline-flex items-center gap-1 font-mono text-[10px] text-[#22C55E]">
                  <Check className="h-3 w-3" strokeWidth={1.5} /> All changes saved
                </span>
              )}
            </div>
            {menuBar && <div className="-ml-2">{menuBar}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!pdfMode && (
            <CollabPresenceBar
              participants={participants}
              locked={locked}
              canToggleLock={canToggleLock}
              lockPending={lockPending}
              activeHint={activeHint}
              onToggleLock={onToggleLock}
            />
          )}
          {onExportCsv && (
            <Button type="button" variant="secondary" onClick={onExportCsv}>
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Export CSV
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
          </Button>
          {!pdfMode && canWrite && (
            <Button type="button" variant="primary" disabled={!dirty || saving || loading} onClick={() => onSave(false)}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
              <kbd className="ml-1 border border-[#0D1117]/30 bg-[#0D1117]/20 px-1 py-0.5 font-mono text-[10px]">Ctrl+S</kbd>
            </Button>
          )}
        </div>
      </header>

      {locked && !pdfMode && (
        <div data-testid="office-locked-banner" role="status" className="flex items-center gap-2 border-b border-[#EAB308]/40 bg-[#EAB308]/10 px-4 py-1.5 text-xs text-[#EAB308]">
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>This document is locked by the owner. Unlock to edit.</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
          <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> {error}</span>
          <button type="button" aria-label="Dismiss error" onClick={onDismissError}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
        </div>
      )}

      {confirmDiscard && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22C55E]/50 bg-[#052E16] px-4 py-2 text-xs text-[#E6EDF3]">
          <span>You have unsaved changes. Save before closing or discard changes?</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onKeepEditing}>Keep Editing</Button>
            <Button type="button" variant="secondary" onClick={onDiscard}>Discard Changes</Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => onSave(true)}>Save & Close</Button>
          </div>
        </div>
      )}
    </>
  );
}
