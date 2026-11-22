import { Download, Paperclip } from 'lucide-react';
import type { ChatAttachmentDto } from '../../types/workspace.types';
import type { PreviewImageItem } from './ChatImageLightbox';

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)(\?|$)/i;

function safeUrl(url: string): boolean {
  const value = url.toLowerCase();
  return value.startsWith('https://') || value.startsWith('http://') || url.startsWith('/api/');
}

export function isImageAttachment(name: string | null | undefined, url: string): boolean {
  if (name && IMAGE_EXT_RE.test(name)) return true;
  return IMAGE_EXT_RE.test(url);
}

export function resolveMessageAttachments(
  attachments: ChatAttachmentDto[] | undefined,
  attachmentName: string | null | undefined,
  attachmentUrl: string | null | undefined
): ChatAttachmentDto[] {
  const list = attachments && attachments.length > 0
    ? attachments
    : attachmentUrl?.trim()
      ? [{ name: attachmentName?.trim() || attachmentUrl.trim(), url: attachmentUrl.trim() }]
      : [];
  return list.filter((item) => item?.url && safeUrl(item.url.trim()));
}

export function partitionImageRows<T>(items: T[]): T[][] {
  const n = items.length;
  if (n <= 3) return n === 0 ? [] : [items];
  if (n === 4) return [items.slice(0, 2), items.slice(2, 4)];
  if (n % 3 === 0) {
    const rows: T[][] = [];
    for (let i = 0; i < n; i += 3) rows.push(items.slice(i, i + 3));
    return rows;
  }
  if (n % 3 === 1) {
    const rows: T[][] = [];
    for (let i = 0; i < n - 4; i += 3) rows.push(items.slice(i, i + 3));
    rows.push(items.slice(n - 4, n));
    return rows;
  }
  const rows: T[][] = [items.slice(0, 2)];
  for (let i = 2; i < n; i += 3) rows.push(items.slice(i, i + 3));
  return rows;
}

export function partitionFileRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

const IMAGE_ROW_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

interface ChatMessageAttachmentProps {
  attachments?: ChatAttachmentDto[];
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  mine: boolean;
  hasText: boolean;
  onPreviewImage?: (image: PreviewImageItem) => void;
}

export function ChatMessageAttachment({
  attachments,
  attachmentName,
  attachmentUrl,
  mine,
  hasText,
  onPreviewImage,
}: ChatMessageAttachmentProps) {
  const items = resolveMessageAttachments(attachments, attachmentName, attachmentUrl);
  if (items.length === 0) return null;

  const images = items.filter((item) => isImageAttachment(item.name, item.url));
  const files = items.filter((item) => !isImageAttachment(item.name, item.url));
  const imageRows = partitionImageRows(images);
  const fileRows = partitionFileRows(files);

  const cardClass = mine
    ? 'border-[#1E5631] bg-[#051C0F] hover:border-[#22C55E]'
    : 'border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]';

  return (
    <div className={hasText ? 'mt-2 space-y-1.5' : 'space-y-1.5'}>
      {images.length === 1 && images[0] && (
        onPreviewImage ? (
          <button
            type="button"
            aria-label={`Preview image: ${images[0].name}`}
            onClick={(e) => {
              e.stopPropagation();
              onPreviewImage({ url: images[0]!.url, name: images[0]!.name });
            }}
            className="block cursor-zoom-in overflow-hidden border border-[#30363D] bg-[#0D1117] p-0 text-left transition-colors hover:border-[#22C55E]"
          >
            <img src={images[0].url} alt={images[0].name} loading="lazy" className="block max-h-[420px] max-w-[440px] object-cover" />
          </button>
        ) : (
          <a
            href={images[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden border border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]"
          >
            <img src={images[0].url} alt={images[0].name} loading="lazy" className="block max-h-[420px] max-w-[440px] object-cover" />
          </a>
        )
      )}

      {images.length > 1 && (
        <div className="w-[440px] max-w-full space-y-0.5">
          {imageRows.map((row, rowIdx) => (
            <div key={rowIdx} className={`grid gap-0.5 ${IMAGE_ROW_COLS[row.length] ?? 'grid-cols-3'}`}>
              {row.map((img, idx) =>
                onPreviewImage ? (
                  <button
                    key={`${img.url}-${idx}`}
                    type="button"
                    aria-label={`Preview image: ${img.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewImage({ url: img.url, name: img.name });
                    }}
                    className="block aspect-square cursor-zoom-in overflow-hidden border border-[#30363D] bg-[#0D1117] p-0 transition-colors hover:border-[#22C55E]"
                  >
                    <img src={img.url} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <a
                    key={`${img.url}-${idx}`}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden border border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]"
                  >
                    <img src={img.url} alt={img.name} loading="lazy" className="h-full w-full object-cover" />
                  </a>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className={files.length > 1 ? 'w-[440px] max-w-full space-y-0.5' : 'space-y-0.5'}>
          {fileRows.map((row, rowIdx) => (
            <div key={rowIdx} className={`grid gap-0.5 ${row.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {row.map((file, idx) => (
                <a
                  key={`${file.url}-${idx}`}
                  href={file.url}
                  download={file.name || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-w-0 items-center gap-2 border px-2.5 py-2 text-xs transition-colors ${cardClass}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#1E5631] bg-[#052E16] text-[#22C55E]">
                    <Paperclip className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-[#E6EDF3]">{file.name}</span>
                    <span className="block text-[10px] text-[#7D8590]">Download attachment</span>
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
