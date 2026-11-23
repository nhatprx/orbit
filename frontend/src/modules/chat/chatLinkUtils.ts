import { apiRequest } from '../../services/workspace/httpClient';

export interface LinkPreviewDto {
  url: string;
  host: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export type TextToken =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

const WEB_TLDS =
  'com|net|org|io|dev|app|ai|co|vn|edu|gov|me|info|biz|xyz|tech|cloud|site|online|store|blog|gg|tv|cc|sh|so|to|uk|us|jp|kr|de|fr|ca|au|sg|in|eu|ch|nl|se|no|fi|es|it|br|mx|id|th|my|ph|tw|hk|pro|design|studio|space|live|news|world|digital|agency|solutions|systems|network|software|works|tools|pages';

const TOKEN_RE = new RegExp(
  `(https?:\\/\\/[^\\s<>"']+)|((?:[a-zA-Z0-9-]+\\.)+(?:${WEB_TLDS})(?:\\.vn|\\.uk|\\.jp|\\.au|\\.sg)?(?::\\d{2,5})?(?:\\/[^\\s<>"']*)?)`,
  'gi'
);

export function stripTrailingPunctuation(raw: string): { url: string; trailing: string } {
  const match = raw.match(/^(.*?)([.,!?;:)\]]+)$/);
  if (!match) return { url: raw, trailing: '' };
  return { url: match[1] || raw, trailing: match[2] || '' };
}

function normalizeHref(raw: string): string | null {
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function tokenizeTextLinks(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let cursor = 0;
  TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const start = match.index;
    const rawMatch = match[0];
    const prevChar = start > 0 ? text[start - 1] : '';
    if (prevChar && /[A-Za-z0-9_@./]/.test(prevChar)) continue;

    const { url, trailing } = stripTrailingPunctuation(rawMatch);
    const href = normalizeHref(url);
    if (!href) continue;

    if (start > cursor) {
      tokens.push({ type: 'text', value: text.slice(cursor, start) });
    }
    tokens.push({ type: 'link', label: url, href });
    cursor = start + rawMatch.length - trailing.length;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', value: text.slice(cursor) });
  }
  return tokens;
}

export function extractAllUrls(text: string): string[] {
  return tokenizeTextLinks(text)
    .filter((t): t is { type: 'link'; label: string; href: string } => t.type === 'link')
    .map((t) => t.href);
}

export function extractFirstUrl(text: string): string | null {
  return extractAllUrls(text)[0] ?? null;
}

const previewCache = new Map<string, Promise<LinkPreviewDto | null>>();

export function fetchLinkPreview(url: string): Promise<LinkPreviewDto | null> {
  const cached = previewCache.get(url);
  if (cached) return cached;
  const promise = apiRequest<LinkPreviewDto>('GET', '/api/v1/chat/link-preview', { query: { url } }).catch(
    () => null
  );
  previewCache.set(url, promise);
  return promise;
}
