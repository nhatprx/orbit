import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Download, FileSpreadsheet, FileText, Presentation, Save, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { formatBytes } from '../../cloudFormat';
import { OrbitDocEditor } from './OrbitDocEditor';
import { OrbitPdfViewer } from './OrbitPdfViewer';
import { OrbitSheetEditor } from './OrbitSheetEditor';
import { OrbitSlideEditor } from './OrbitSlideEditor';
import type { OfficeDocContentDto, OfficeFormat, OfficeSheetContentDto, OfficeSlideContentDto } from './officeTypes';

export interface OrbitOfficeWorkspaceProps {
  node: CloudNodeDto;
  api: CloudFilesApi;
  canWrite: boolean;
  isPdf?: boolean;
  onBack: () => void;
  onDownload: (node: CloudNodeDto) => void;
  onSaved: (node: CloudNodeDto) => void;
}

function inferInitialFormat(name: string): OfficeFormat {
  const lower = name.toLowerCase();
  return lower.endsWith('.xlsx') ? 'XLSX' : lower.endsWith('.pptx') ? 'PPTX' : 'DOCX';
}

export function OrbitOfficeWorkspace({
  node, api, canWrite, isPdf, onBack, onDownload, onSaved,
}: OrbitOfficeWorkspaceProps) {
  const pdfMode = Boolean(isPdf || node.name.toLowerCase().endsWith('.pdf'));
  const [loading, setLoading] = useState(!pdfMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<OfficeFormat>(() => inferInitialFormat(node.name));
  const [updatedAt, setUpdatedAt] = useState<string | null>(node.updatedAt);
  const [dirty, setDirty] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [doc, setDoc] = useState<OfficeDocContentDto | null>(null);
  const [sheet, setSheet] = useState<OfficeSheetContentDto | null>(null);
  const [slide, setSlide] = useState<OfficeSlideContentDto | null>(null);

  useEffect(() => {
    setFormat(inferInitialFormat(node.name));
    setConfirmDiscard(false);
    setSavedNotice(false);
    if (pdfMode) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDirty(false);
    api.getOfficeContent(node.id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setFormat(res.format);
        setUpdatedAt(res.updatedAt);
        setDoc(res.doc ?? { blocks: [{ type: 'p', text: '', align: 'left' }], tables: [] });
        setSheet(res.sheet ?? { sheets: [{ name: 'Sheet1', rows: [['', ''], ['', '']] }] });
        setSlide(res.slide ?? { slides: [{ title: node.name, subtitle: '', bullets: [''], notes: '' }] });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load Orbit Office document.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [node.id, node.name, api, pdfMode]);

  const handleSave = useCallback(async (closeAfter = false) => {
    if (pdfMode || !canWrite || !dirty || saving || loading) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.saveOfficeContent(node.id, {
        format, expectedUpdatedAt: updatedAt,
        doc: format === 'DOCX' ? doc : null,
        sheet: format === 'XLSX' ? sheet : null,
        slide: format === 'PPTX' ? slide : null,
      });
      setUpdatedAt(updated.updatedAt);
      setDirty(false);
      setSavedNotice(true);
      setConfirmDiscard(false);
      onSaved(updated);
      if (closeAfter) onBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save Orbit Office document.');
    } finally {
      setSaving(false);
    }
  }, [pdfMode, canWrite, dirty, saving, loading, api, node.id, format, updatedAt, doc, sheet, slide, onSaved, onBack]);

  const requestBack = useCallback(() => {
    if (!pdfMode && dirty && canWrite) setConfirmDiscard(true);
    else onBack();
  }, [pdfMode, dirty, canWrite, onBack]);

  useEffect(() => {
    if (pdfMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave(false);
      } else if (event.key === 'Escape' && dirty && canWrite) {
        event.preventDefault();
        setConfirmDiscard(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pdfMode, handleSave, dirty, canWrite]);

  const statusLabel = pdfMode || !canWrite ? 'Read-Only' : dirty ? 'Dirty' : 'Saved';
  const dotColor = pdfMode || !canWrite ? 'bg-[#8B949E]' : dirty ? 'bg-[#22C55E]' : 'bg-[#30363D]';
  const formatBadge = pdfMode ? 'PDF VIEWER' : format === 'XLSX' ? 'ORBIT SHEETS' : format === 'PPTX' ? 'ORBIT SLIDES' : 'ORBIT DOCS';
  const FormatIcon = pdfMode ? FileText : format === 'XLSX' ? FileSpreadsheet : format === 'PPTX' ? Presentation : FileText;

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="secondary" onClick={requestBack}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to files
          </Button>
          <FormatIcon className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <span className="border border-[#22C55E]/40 bg-[#052E16] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]">{formatBadge}</span>
          <span className="truncate text-sm font-semibold text-[#E6EDF3]">{node.name}</span>
          <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#8B949E]">{formatBytes(node.sizeBytes)}</span>
          <span className="flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">
            <span className={`inline-block h-1.5 w-1.5 rounded-none ${dotColor}`} aria-hidden="true" />
            {statusLabel}
          </span>
          {savedNotice && !dirty && (
            <span role="status" className="flex items-center gap-1 border border-[#22C55E]/40 bg-[#052E16] px-2 py-0.5 font-mono text-[10px] text-[#22C55E]">
              <Check className="h-3 w-3" strokeWidth={1.5} /> All changes saved to Cloud
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => onDownload(node)}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Download
          </Button>
          {!pdfMode && canWrite && (
            <Button type="button" variant="primary" disabled={!dirty || saving || loading} onClick={() => void handleSave(false)}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
              <kbd className="ml-1 border border-[#0D1117]/30 bg-[#0D1117]/20 px-1 py-0.5 font-mono text-[10px]">Ctrl+S</kbd>
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
          <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> {error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
        </div>
      )}

      {confirmDiscard && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22C55E]/50 bg-[#052E16] px-4 py-2 text-xs text-[#E6EDF3]">
          <span>You have unsaved changes. Save before closing or discard changes?</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep Editing</Button>
            <Button type="button" variant="secondary" onClick={() => { setConfirmDiscard(false); onBack(); }}>Discard Changes</Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave(true)}>Save & Close</Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {pdfMode ? (
          <OrbitPdfViewer node={node} api={api} onDownload={onDownload} />
        ) : loading ? (
          <div className="flex h-full items-center justify-center font-mono text-xs text-[#8B949E]">Loading Orbit Office workspace...</div>
        ) : format === 'XLSX' && sheet ? (
          <OrbitSheetEditor value={sheet} readOnly={!canWrite} onChange={(next) => { setSheet(next); setDirty(true); setSavedNotice(false); }} />
        ) : format === 'PPTX' && slide ? (
          <OrbitSlideEditor value={slide} readOnly={!canWrite} onChange={(next) => { setSlide(next); setDirty(true); setSavedNotice(false); }} />
        ) : (
          doc && <OrbitDocEditor value={doc} readOnly={!canWrite} onChange={(next) => { setDoc(next); setDirty(true); setSavedNotice(false); }} />
        )}
      </div>
    </div>
  );
}
