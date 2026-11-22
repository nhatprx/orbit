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

    const attList =
      msg.attachments && msg.attachments.length > 0
        ? msg.attachments
        : msg.attachmentUrl?.trim()
          ? [{ name: msg.attachmentName?.trim() || msg.attachmentUrl.trim(), url: msg.attachmentUrl.trim() }]
          : [];
    attList.forEach((att, idx) => {
      const attUrl = att.url?.trim();
      if (!attUrl || !isSafeUrl(attUrl)) return;
      const item: SharedMediaItem = {
        id: `${msg.id}-${idx}`,
        url: attUrl,
        name: att.name?.trim() || attUrl,
        senderName: msg.senderName,
        createdAt: msg.createdAt,
      };
      if (isImageUrl(att.name, attUrl)) images.push(item);
      else files.push(item);
    });

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
