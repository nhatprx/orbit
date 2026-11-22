import { ExternalLink, Paperclip } from 'lucide-react';
import type { PreviewImageItem } from './ChatImageLightbox';

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)(\?|$)/i;

function safeUrl(url: string): boolean {
  const value = url.toLowerCase();
  return value.startsWith('https://') || value.startsWith('http://') || url.startsWith('/api/');
}

function isImageAttachment(name: string | null | undefined, url: string): boolean {
  if (url.startsWith('/api/v1/chat/images?key=')) return true;
  if (name && IMAGE_EXT_RE.test(name)) return true;
  return IMAGE_EXT_RE.test(url);
}

interface ChatMessageAttachmentProps {
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  mine: boolean;
  hasText: boolean;
  onPreviewImage?: (image: PreviewImageItem) => void;
}

export function ChatMessageAttachment({
  attachmentName,
  attachmentUrl,
  mine,
  hasText,
  onPreviewImage,
}: ChatMessageAttachmentProps) {
  const url = attachmentUrl?.trim();
  if (!url || !safeUrl(url)) return null;

  if (isImageAttachment(attachmentName, url)) {
    const label = attachmentName || 'Shared image';
    const imageEl = (
      <img
        src={url}
        alt={label}
        loading="lazy"
        className="max-h-72 max-w-[300px] object-cover"
      />
    );
    const frameClass = `block overflow-hidden border border-[#30363D] bg-[#0D1117] hover:border-[#22C55E] ${
      hasText ? 'mt-2' : ''
    }`;

    if (onPreviewImage) {
      return (
        <button
          type="button"
          aria-label={`Preview image: ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onPreviewImage({ url, name: label });
          }}
          className={`${frameClass} cursor-zoom-in text-left`}
        >
          {imageEl}
        </button>
      );
    }

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={frameClass}>
        {imageEl}
      </a>
    );
  }

  const cardClass = mine
    ? 'border-[#1E5631] bg-[#051C0F] hover:border-[#22C55E]'
    : 'border-[#30363D] bg-[#0D1117] hover:border-[#22C55E]';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex max-w-sm items-center gap-2.5 border px-2.5 py-2 text-xs transition-colors ${cardClass}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#1E5631] bg-[#052E16] text-[#22C55E]">
        <Paperclip className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-[#E6EDF3]">
          {attachmentName || url}
        </span>
        <span className="block text-[10px] text-[#7D8590]">Open attachment</span>
      </span>
      <ExternalLink className="h-3 w-3 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
    </a>
  );
}
