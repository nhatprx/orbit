import type { ChatMessageDto } from '../../types/workspace.types';

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)(\?|$)/i;
const URL_RE = /https?:\/\/[^\s<>()]+/gi;

export interface SharedMediaItem {
  id: string;
  url: string;
  name: string;
  senderName: string;
  createdAt: string;
}

export interface SharedLinkItem {
  id: string;
  url: string;
  host: string;
  createdAt: string;
}

function isSafeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://') || url.startsWith('/api/');
}

export function isImageUrl(name: string | null | undefined, url: string): boolean {
  if (url.startsWith('/api/v1/chat/images?key=')) return true;
  if (name && IMAGE_EXT_RE.test(name)) return true;
  return IMAGE_EXT_RE.test(url);
}

export function extractChannelMedia(messages: ChatMessageDto[]): {
  images: SharedMediaItem[];
  files: SharedMediaItem[];
  links: SharedLinkItem[];
} {
  const images: SharedMediaItem[] = [];
  const files: SharedMediaItem[] = [];
  const links: SharedLinkItem[] = [];
  const seenLinks = new Set<string>();

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.deletedAt) continue;

    const attUrl = msg.attachmentUrl?.trim();
    if (attUrl && isSafeUrl(attUrl)) {
      const item: SharedMediaItem = {
        id: msg.id,
        url: attUrl,
        name: msg.attachmentName?.trim() || attUrl,
        senderName: msg.senderName,
        createdAt: msg.createdAt,
      };
      if (isImageUrl(msg.attachmentName, attUrl)) {
        images.push(item);
      } else {
        files.push(item);
      }
    }

    const matches = msg.content.match(URL_RE) ?? [];
    for (const raw of matches) {
      const cleaned = raw.replace(/[.,;!?]+$/, '');
      if (!isSafeUrl(cleaned) || seenLinks.has(cleaned)) continue;
      seenLinks.add(cleaned);
      let host = cleaned;
      try {
        host = new URL(cleaned).hostname.replace(/^www\./, '');
      } catch {
        // keep cleaned url
      }
      links.push({ id: `${msg.id}-${links.length}`, url: cleaned, host, createdAt: msg.createdAt });
    }
  }

  return { images, files, links };
}
