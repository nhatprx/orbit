import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Columns2, FileCode2, Lock, Save, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { CollabPresenceBar } from '../../collab/CollabPresenceBar';
import { formatBytes } from '../cloudFormat';
import { CodeMirrorHost } from './CodeMirrorHost';
import { isMarkdownFile } from './fileEditorRegistry';
import { MarkdownPreviewPane } from './MarkdownPreviewPane';
import { useTextEditorCollab } from './useTextEditorCollab';

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface CloudTextEditorModalProps {
  node: CloudNodeDto | null;
  api: CloudFilesApi;
  canWrite: boolean;
  canManage?: boolean;
  onClose: () => void;
  onSaved: (updated: CloudNodeDto) => void;
}

export function CloudTextEditorModal({
  node, api, canWrite, canManage, onClose, onSaved,
}: CloudTextEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState('');
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [loadSeq, setLoadSeq] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const collab = useTextEditorCollab({
    node, api, canWrite, canManage, onRemoteContent: setContent,
    onRemoteCheckpoint: (nextUpdatedAt, nextContent) => {
      if (nextUpdatedAt) setUpdatedAt(nextUpdatedAt);
      if (nextContent !== undefined) setSavedContent(nextContent);
      else setSavedContent((prev) => content || prev);
    },
    onSaved, onError: setError,
  });

  const { effectiveCanWrite, isLocked, canToggleLock, lockPending } = collab;
  const isMarkdown = node ? isMarkdownFile(node.name, node.mimeType) : false;
  const dirty = content !== savedContent;

  useEffect(() => {
    if (!node) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setConfirmDiscard(false);
    setShowPreview(isMarkdownFile(node.name, node.mimeType));
    api.getTextContent(node.id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setSavedContent(res.content);
        setContent(res.content);
        setUpdatedAt(res.updatedAt);
        setLoadSeq((prev) => prev + 1);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Failed to load document content.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [node?.id, node?.name, node?.mimeType, api]);

  const handleSave = useCallback(async () => {
    if (!node || !effectiveCanWrite || saving || loading || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.saveTextContent(node.id, { content, expectedUpdatedAt: updatedAt });
      setSavedContent(content);
      setUpdatedAt(updated.updatedAt);
      setConfirmDiscard(false);
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save document.');
    } finally {
      setSaving(false);
    }
  }, [node, effectiveCanWrite, saving, loading, dirty, api, content, updatedAt, onSaved]);

  useEffect(() => {
    if (!dirty || !effectiveCanWrite || saving || loading) return;
    const timer = window.setTimeout(() => { void handleSave(); }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, effectiveCanWrite, saving, loading, handleSave]);

  const handleLocalChange = useCallback((nextVal: string) => {
    setContent(nextVal);
    collab.broadcastTextChange(nextVal);
  }, [collab]);

  const requestClose = useCallback(() => {
    if (dirty && effectiveCanWrite) { setConfirmDiscard(true); return; }
    onClose();
  }, [dirty, effectiveCanWrite, onClose]);

  useEffect(() => {
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void handleSave(); }
      else if (event.key === 'Escape') { event.preventDefault(); requestClose(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [node, handleSave, requestClose]);

  if (!node) return null;

  const statusColor = !effectiveCanWrite ? 'bg-[#7D8590]' : dirty ? 'bg-[#22C55E]' : 'bg-[#30363D]';
  const statusLabel = !effectiveCanWrite ? 'Read-Only' : dirty ? 'Unsaved' : 'Saved';

  return (
    <div aria-label={`Editor for ${node.name}`} className="flex h-full w-full flex-col bg-[#0D1117]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="secondary" onClick={requestClose}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to files
          </Button>
          <FileCode2 className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-[#E6EDF3]">{node.name}</span>
          <span className="hidden font-mono text-[11px] text-[#7D8590] sm:inline">{formatBytes(node.sizeBytes)}</span>
          <span className="flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">
            <span className={`inline-block h-1.5 w-1.5 rounded-none ${statusColor}`} aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CollabPresenceBar
            participants={collab.participants} locked={isLocked} canToggleLock={canToggleLock}
            lockPending={lockPending} onToggleLock={() => void collab.handleToggleLock()}
          />
          {isMarkdown && (
            <Button type="button" variant={showPreview ? 'primary' : 'secondary'} onClick={() => setShowPreview((prev) => !prev)}>
              <Columns2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {showPreview ? 'Hide Preview' : 'Split Preview'}
            </Button>
          )}
          {effectiveCanWrite && (
            <Button type="button" variant="primary" disabled={!dirty || saving || loading} onClick={() => void handleSave()}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </header>
      {isLocked && (
        <div data-testid="text-editor-locked-banner" role="status" className="flex items-center gap-2 border-b border-[#EAB308]/40 bg-[#EAB308]/10 px-4 py-1.5 text-xs text-[#EAB308]">
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span>This file is locked by the owner. Unlock to edit.</span>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
          <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> {error}</span>
          <button type="button" aria-label="Dismiss editor error" onClick={() => setError(null)}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
        </div>
      )}
      {confirmDiscard && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22C55E]/50 bg-[#052E16] px-4 py-2 text-xs text-[#E6EDF3]">
          <span>You have unsaved changes. Discard them and close?</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep Editing</Button>
            <Button type="button" variant="primary" onClick={onClose}>Discard Changes</Button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center font-mono text-xs text-[#7D8590]">Loading document...</div>
        ) : (
          <>
            <div className={isMarkdown && showPreview ? 'h-full w-1/2 min-w-0' : 'h-full w-full min-w-0'}>
              <CodeMirrorHost
                docKey={`${node.id}:${loadSeq}`} fileName={node.name} initialValue={savedContent}
                value={content} readOnly={!effectiveCanWrite} onChange={handleLocalChange}
                onCursorChange={collab.handleCursorChange}
              />
            </div>
            {isMarkdown && showPreview && (
              <div className="h-full w-1/2 min-w-0"><MarkdownPreviewPane content={content} /></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
