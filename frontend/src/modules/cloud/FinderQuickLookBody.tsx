import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { AlertCircle, Download, FilePenLine, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { CloudNodeDto } from '../../types/cloud.types';
import { formatDateTime } from '../../utils/format';
import { formatBytes, humanFileKind } from './cloudFormat';
import { CloudNodeIcon } from './cloudIcons';
import type { QuickLookKind } from './quickLookClassify';

interface FinderQuickLookBodyProps {
  node: CloudNodeDto;
  kind: QuickLookKind;
  loading: boolean;
  error: string | null;
  textContent: string | null;
  mediaUrl: string | null;
  canOpenEditor: boolean;
  onOpenEditor: () => void;
  onDownload: () => void;
}

const MD_CLASSES =
  'space-y-3 text-sm leading-relaxed text-[#E6EDF3] [&_a]:text-[#22C55E] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#22C55E] [&_blockquote]:bg-[#161B22] [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-[#8B949E] [&_code]:border [&_code]:border-[#30363D] [&_code]:bg-[#161B22] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#22C55E] [&_h1]:border-b [&_h1]:border-[#30363D] [&_h1]:pb-1.5 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_hr]:border-[#30363D] [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#30363D] [&_pre]:bg-[#161B22] [&_pre]:p-3 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#30363D] [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#30363D] [&_th]:bg-[#161B22] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_ul]:list-disc';

export function FinderQuickLookBody({
  node,
  kind,
  loading,
  error,
  textContent,
  mediaUrl,
  canOpenEditor,
  onOpenEditor,
  onDownload,
}: FinderQuickLookBodyProps) {
  const sanitizedMarkdown = useMemo(() => {
    if (kind !== 'MARKDOWN' || textContent === null) return '';
    const parsed = marked.parse(textContent, { async: false });
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [kind, textContent]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 bg-[#0D1117] font-mono text-xs text-[#7D8590]">
        <Loader2 className="h-4 w-4 animate-spin text-[#22C55E]" strokeWidth={1.5} />
        Loading preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#0D1117] p-6 text-center text-xs text-[#EF4444]">
        <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
        <p>{error}</p>
        <Button type="button" variant="secondary" onClick={onDownload}>
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          Download File
        </Button>
      </div>
    );
  }

  if (kind === 'MARKDOWN') {
    return (
      <div data-testid="quick-look-markdown" className="flex-1 overflow-auto bg-[#0D1117] p-6">
        <div className={MD_CLASSES} dangerouslySetInnerHTML={{ __html: sanitizedMarkdown }} />
      </div>
    );
  }

  if (kind === 'TEXT') {
    return (
      <pre
        data-testid="quick-look-text"
        className="flex-1 overflow-auto whitespace-pre-wrap break-words bg-[#0D1117] p-5 font-mono text-xs leading-relaxed text-[#E6EDF3]"
      >
        {textContent ?? ''}
      </pre>
    );
  }

  if (kind === 'IMAGE' && mediaUrl) {
    return (
      <div data-testid="quick-look-image" className="flex flex-1 items-center justify-center overflow-auto bg-[#0D1117] p-6">
        <img src={mediaUrl} alt={node.name} className="max-h-full max-w-full border border-[#30363D] object-contain" />
      </div>
    );
  }

  if (kind === 'PDF' && mediaUrl) {
    return (
      <div data-testid="quick-look-pdf" className="flex flex-1 bg-[#0D1117]">
        <iframe title={node.name} src={mediaUrl} className="h-full w-full border-0 bg-[#0D1117]" />
      </div>
    );
  }

  return (
    <div data-testid="quick-look-binary" className="flex flex-1 flex-col items-center justify-center bg-[#0D1117] p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center border border-[#30363D] bg-[#161B22]">
        <CloudNodeIcon node={node} className="h-10 w-10" />
      </div>
      <p className="mt-4 max-w-md truncate text-base font-semibold text-[#E6EDF3]" title={node.name}>
        {node.name}
      </p>
      <p className="mt-1 font-mono text-xs text-[#22C55E]">{humanFileKind(node)}</p>

      <div className="mt-5 w-full max-w-sm border border-[#30363D] bg-[#161B22] px-4 py-2 text-left text-xs">
        <div className="flex justify-between gap-4 border-b border-[#21262D] py-1.5">
          <span className="text-[#7D8590]">Size</span>
          <span className="font-mono text-[#E6EDF3]">{formatBytes(node.sizeBytes)}</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-[#21262D] py-1.5">
          <span className="text-[#7D8590]">Folder</span>
          <span className="truncate font-mono text-[#E6EDF3]" title={node.folderPath || '/'}>
            {node.folderPath || '/'}
          </span>
        </div>
        <div className="flex justify-between gap-4 py-1.5">
          <span className="text-[#7D8590]">Modified</span>
          <span className="font-mono text-[#E6EDF3]">{formatDateTime(node.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {kind === 'OFFICE' && canOpenEditor && (
          <Button type="button" variant="primary" onClick={onOpenEditor}>
            <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
            Open in Univer
          </Button>
        )}
        <Button type="button" variant={kind === 'OFFICE' && canOpenEditor ? 'secondary' : 'primary'} onClick={onDownload}>
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          Download
        </Button>
      </div>
    </div>
  );
}
