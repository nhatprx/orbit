import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto, OnlyOfficeSessionResponse } from '../../../types/cloud.types';
import { formatBytes } from '../cloudFormat';
import { loadOnlyOfficeScript, type DocsApiEditorInstance } from './onlyOfficeLoader';

interface CloudOnlyOfficeModalProps {
  node: CloudNodeDto | null;
  api: CloudFilesApi;
  onClose: () => void;
  onDownload: (node: CloudNodeDto) => void;
  onRefresh: () => void;
}

type ModalStatus = 'loading' | 'ready' | 'unavailable';

export function CloudOnlyOfficeModal({
  node,
  api,
  onClose,
  onDownload,
  onRefresh,
}: CloudOnlyOfficeModalProps) {
  const containerId = useId().replace(/:/g, '_');
  const editorRef = useRef<DocsApiEditorInstance | null>(null);
  const hadActiveEditorRef = useRef(false);

  const [status, setStatus] = useState<ModalStatus>('loading');
  const [session, setSession] = useState<OnlyOfficeSessionResponse | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    const controller = new AbortController();
    hadActiveEditorRef.current = false;
    setStatus('loading');
    setSession(null);
    setReason(null);

    api
      .getOnlyOfficeSession(node.id, controller.signal)
      .then(async (res) => {
        if (controller.signal.aborted) return;
        setSession(res);
        if (!res.enabled || !res.documentServerUrl || !res.config) {
          setReason('ONLYOFFICE Document Server is currently disabled or not configured for this environment.');
          setStatus('unavailable');
          return;
        }
        const docsApi = await loadOnlyOfficeScript(res.documentServerUrl);
        if (controller.signal.aborted) return;

        const config: Record<string, unknown> = {
          ...res.config,
          width: '100%',
          height: '100%',
          ...(res.token ? { token: res.token } : {}),
        };
        editorRef.current = new docsApi.DocEditor(`oo_${containerId}`, config);
        hadActiveEditorRef.current = true;
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setReason(
          err instanceof Error
            ? err.message
            : 'Unable to reach ONLYOFFICE Document Server.'
        );
        setStatus('unavailable');
      });

    return () => {
      controller.abort();
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, [node, api, containerId]);

  if (!node) return null;

  const handleClose = () => {
    if (hadActiveEditorRef.current) onRefresh();
    onClose();
  };

  const modeLabel =
    status === 'unavailable'
      ? 'Offline'
      : session?.mode === 'edit'
        ? 'Edit'
        : session?.mode === 'view'
          ? 'View'
          : 'Connecting';
  const dotColor = status === 'ready' ? 'bg-[#22C55E]' : status === 'unavailable' ? 'bg-[#EF4444]' : 'bg-[#7D8590]';

  return (
    <div role="dialog" aria-modal="true" aria-label={`Office editor for ${node.name}`} className="fixed inset-0 z-50 flex flex-col bg-[#0D1117]">
      <header className="flex items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
          <span className="truncate text-sm font-semibold text-[#E6EDF3]">{node.name}</span>
          <span className="hidden font-mono text-[11px] text-[#7D8590] sm:inline">{formatBytes(node.sizeBytes)}</span>
          <span className="flex items-center gap-1.5 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">
            <span className={`inline-block h-1.5 w-1.5 rounded-none ${dotColor}`} aria-hidden="true" />
            {modeLabel}
          </span>
        </div>

        <Button type="button" variant="secondary" aria-label="Close office editor" onClick={handleClose}>
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          Close
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 bg-[#0D1117]">
        <div
          id={`oo_${containerId}`}
          data-testid="onlyoffice-mount"
          className={status === 'ready' ? 'h-full w-full' : 'hidden'}
        />

        {status === 'loading' && (
          <div className="flex flex-1 items-center justify-center font-mono text-xs text-[#7D8590]">
            Connecting to ONLYOFFICE Document Server...
          </div>
        )}

        {status === 'unavailable' && (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md border border-[#30363D] bg-[#161B22] p-6">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                <h2 className="text-sm font-semibold text-[#E6EDF3]">ONLYOFFICE Document Server Unavailable</h2>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#8B949E]">
                {reason ?? 'ONLYOFFICE Document Server is not running or configured.'}
              </p>
              <p className="mt-2 font-mono text-[11px] text-[#7D8590]">
                You can download this Office document directly to view or edit it locally.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
                <Button type="button" variant="primary" onClick={() => onDownload(node)}>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Download File
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
