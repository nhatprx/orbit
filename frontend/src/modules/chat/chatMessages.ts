import type { ChatMessageDto } from '../../types/workspace.types';

function compare(a: ChatMessageDto, b: ChatMessageDto): number {
  return a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt);
}

/** Inserts a live or sent message in chronological position; duplicates (same id) are ignored. */
export function mergeMessage(messages: ChatMessageDto[], incoming: ChatMessageDto): ChatMessageDto[] {
  if (messages.some((m) => m.id === incoming.id)) return messages;
  return [...messages, incoming].sort(compare);
}

/** Prepends an older page, dropping anything already loaded. */
export function mergeOlder(messages: ChatMessageDto[], older: ChatMessageDto[]): ChatMessageDto[] {
  const known = new Set(messages.map((m) => m.id));
  return [...older.filter((m) => !known.has(m.id)), ...messages].sort(compare);
}

/** Removes a deleted message by id; returns the original array reference when absent. */
export function removeMessage(messages: ChatMessageDto[], messageId: string): ChatMessageDto[] {
  const next = messages.filter((m) => m.id !== messageId);
  return next.length === messages.length ? messages : next;
}

export const MAX_MESSAGE_LENGTH = 4000;

export type DraftCheck = { ok: true; content: string } | { ok: false; error: string };

export function checkDraft(raw: string): DraftCheck {
  const content = raw.trim();
  if (!content) return { ok: false, error: 'Write a message first.' };
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return { ok: true, content };
}
