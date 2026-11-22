import { useCallback, useEffect, useRef, useState } from 'react';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { OrbitDocEditor } from './OrbitDocEditor';
import { OrbitOfficeHeader, type OrbitOfficeHeaderProps } from './OrbitOfficeHeader';
import { OrbitPdfViewer } from './OrbitPdfViewer';
import { OrbitSheetEditor } from './OrbitSheetEditor';
import { OrbitSlideEditor } from './OrbitSlideEditor';
import type { UniverSheetCanvasHandle } from './UniverSheetCanvas';
import type { OfficeDocContentDto, OfficeFormat, OfficeSheetContentDto, OfficeSlideContentDto } from './officeTypes';
import { useOfficeCollab } from './useOfficeCollab';

const AUTOSAVE_DEBOUNCE_MS = 1500;

export interface OrbitOfficeWorkspaceProps {
  node: CloudNodeDto;
  api: CloudFilesApi;
  canWrite: boolean;
  canManage?: boolean;
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
  node, api, canWrite, canManage, isPdf, onBack, onDownload, onSaved,
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
  const [docResetTick, setDocResetTick] = useState(0);
  const [sheetResetTick, setSheetResetTick] = useState(0);
  const sheetHandleRef = useRef<UniverSheetCanvasHandle | null>(null);

  const collab = useOfficeCollab({
    node, api, format, pdfMode, canWrite, canManage,
    onRemoteDoc: (nextDoc) => { setDoc(nextDoc); setDocResetTick((t) => t + 1); },
    onRemoteSheet: (nextSheet) => { setSheet(nextSheet); setSheetResetTick((t) => t + 1); },
    onRemoteSheetMutation: (mutation) => { sheetHandleRef.current?.applyRemoteMutation(mutation); },
    onRemoteSlide: (nextSlide) => { setSlide(nextSlide); },
    onRemoteCheckpoint: (nextUpdatedAt) => { setUpdatedAt(nextUpdatedAt); setDirty(false); },
    onSaved,
    onError: setError,
  });

  const { effectiveCanWrite, isLocked, canToggleLock, lockPending } = collab;

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
        setSheet(res.sheet ?? { sheets: [{ name: 'Sheet1', rows: [['', ''], ['', '']], cellStyles: {} }] });
        setSlide(res.slide ?? { slides: [{ title: node.name, subtitle: '', bullets: [''], notes: '' }] });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load Orbit Office document.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [node.id, node.name, api, pdfMode]);

  const handleSave = useCallback(async (closeAfter = false) => {
    if (pdfMode || !effectiveCanWrite || !dirty || saving || loading) return;
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
  }, [pdfMode, effectiveCanWrite, dirty, saving, loading, api, node.id, format, updatedAt, doc, sheet, slide, onSaved, onBack]);

  useEffect(() => {
    if (pdfMode || !effectiveCanWrite || !dirty || saving || loading) return;
    const timer = window.setTimeout(() => { void handleSave(false); }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pdfMode, effectiveCanWrite, dirty, saving, loading, handleSave]);

  const requestBack = useCallback(() => {
    if (!pdfMode && dirty && effectiveCanWrite) setConfirmDiscard(true);
    else onBack();
  }, [pdfMode, dirty, effectiveCanWrite, onBack]);

  useEffect(() => {
    if (pdfMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave(false);
      } else if (!event.defaultPrevented && event.key === 'Escape' && dirty && effectiveCanWrite) {
        event.preventDefault();
        setConfirmDiscard(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pdfMode, handleSave, dirty, effectiveCanWrite]);

  const sharedHeaderProps: Omit<OrbitOfficeHeaderProps, 'menuBar'> = {
    node, format, pdfMode, canWrite: effectiveCanWrite, locked: isLocked, canToggleLock, lockPending,
    participants: collab.participants, activeHint: collab.activeHint,
    dirty, saving, loading, savedNotice, error, confirmDiscard,
    onToggleLock: () => void collab.handleToggleLock(),
    onRequestBack: requestBack,
    onDownload: () => onDownload(node),
    onSave: (closeAfter) => void handleSave(closeAfter),
    onDismissError: () => setError(null),
    onKeepEditing: () => setConfirmDiscard(false),
    onDiscard: () => { setConfirmDiscard(false); onBack(); },
  };
  const renderEditorHeaderInline = !pdfMode && !loading && (
    (format === 'XLSX' && Boolean(sheet)) ||
    (format === 'PPTX' && Boolean(slide)) ||
    (format === 'DOCX' && Boolean(doc))
  );

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]">
      {!renderEditorHeaderInline && <OrbitOfficeHeader {...sharedHeaderProps} />}
      <div className="min-h-0 flex-1 overflow-hidden">
        {pdfMode ? (
          <OrbitPdfViewer node={node} api={api} onDownload={onDownload} />
        ) : loading ? (
          <div className="flex h-full items-center justify-center font-mono text-xs text-[#8B949E]">Loading Orbit Office workspace...</div>
        ) : format === 'XLSX' && sheet ? (
          <OrbitSheetEditor
            value={sheet} resetTick={sheetResetTick} readOnly={!effectiveCanWrite} headerProps={sharedHeaderProps}
            onReady={(h) => { sheetHandleRef.current = h; }}
            onLocalMutation={collab.broadcastSheetMutation}
            onSelectionCursorChange={collab.broadcastSheetCursor}
            onChange={(next) => { setSheet(next); setDirty(true); setSavedNotice(false); collab.broadcastSheetSnapshot(next); }}
          />
        ) : format === 'PPTX' && slide ? (
          <OrbitSlideEditor
            value={slide} readOnly={!effectiveCanWrite} participants={collab.participants} headerProps={sharedHeaderProps}
            onActiveSlideBroadcast={collab.broadcastSlideCursor}
            onChange={(next) => { setSlide(next); setDirty(true); setSavedNotice(false); collab.broadcastSlidesSnapshot(next); }}
          />
        ) : (
          doc && (
            <OrbitDocEditor
              value={doc} resetTick={docResetTick} readOnly={!effectiveCanWrite} headerProps={sharedHeaderProps}
              onChange={(next) => { setDoc(next); setDirty(true); setSavedNotice(false); collab.broadcastDocSnapshot(next); }}
            />
          )
        )}
      </div>
    </div>
  );
}
