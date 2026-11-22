import { useEffect, useState } from 'react';
import { Download, FilePenLine, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../types/cloud.types';
import { formatBytes, humanFileKind } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import { classifyFileEditor } from './editor/fileEditorRegistry';
import { FinderQuickLookBody } from './FinderQuickLookBody';
import { classifyQuickLook } from './quickLookClassify';
import { isEditableTarget } from './useFinderShortcuts';

interface FinderQuickLookModalProps {
  node: CloudNodeDto | null;
  api: CloudFilesApi;
  canRead: boolean;
  onClose: () => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
}

export function FinderQuickLookModal({
  node,
  api,
  canRead,
  onClose,
  onOpenEditor,
  onDownload,
}: FinderQuickLookModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const kind = node ? classifyQuickLook(node.name, node.mimeType) : 'BINARY';

  useEffect(() => {
    if (!node) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.key === ' ' || e.code === 'Space') && !isEditableTarget(e.target)) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [node, onClose]);

  useEffect(() => {
    if (!node) return;
    setError(null);
    setTextContent(null);
    setMediaUrl(null);

    if (kind === 'OFFICE' || kind === 'BINARY') {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);

    if (kind === 'MARKDOWN' || kind === 'TEXT') {
      api
        .getTextContent(node.id, controller.signal)
        .then((res) => {
          if (active) setTextContent(res.content);
        })
        .catch((err: unknown) => {
          if (!active || controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Unable to load preview');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      api
        .getDownloadUrl(node.id)
        .then((res) => {
          if (active) setMediaUrl(res.url);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : 'Unable to load file preview');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, kind, node]);

  if (!node) return null;

  const canOpenEditor = canRead && classifyFileEditor(node.name, node.mimeType) !== 'NONE';
  const kindLabel = humanFileKind(node);
  const openInEditor = () => {
    onClose();
    onOpenEditor(node);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quick Look: ${node.name}`}
      data-testid="finder-quick-look"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1117]/80 p-4"
    >
      <div className="flex h-[82vh] w-full max-w-4xl flex-col rounded-none border border-[#30363D] bg-[#161B22]">
        <div className="flex items-center justify-between gap-3 border-b border-[#30363D] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <CloudNodeIcon node={node} className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-semibold text-[#E6EDF3]" title={node.name}>
              {node.name}
            </span>
            <span className="shrink-0 border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]">
              {kindLabel} - {formatBytes(node.sizeBytes)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {canOpenEditor && (
              <Button type="button" variant="primary" onClick={openInEditor} className="px-2.5 py-1 text-xs">
                <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
                Open in Editor
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => onDownload(node)} className="px-2.5 py-1 text-xs">
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              Download
            </Button>
            <button
              type="button"
              aria-label="Close Quick Look"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <FinderQuickLookBody
          node={node}
          kind={kind}
          loading={loading}
          error={error}
          textContent={textContent}
          mediaUrl={mediaUrl}
          canOpenEditor={canOpenEditor}
          onOpenEditor={openInEditor}
          onDownload={() => onDownload(node)}
        />
      </div>
    </div>
  );
}
