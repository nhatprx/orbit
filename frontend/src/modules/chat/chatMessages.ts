import type { ChatMessageDto, ChatReactionEvent, ChatReactionSummaryDto } from '../../types/workspace.types';

function compare(a: ChatMessageDto, b: ChatMessageDto): number {
  return a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt);
}

/** Inserts a live or sent message in chronological position, or updates an existing message when edited/pinned. */
export function mergeMessage(messages: ChatMessageDto[], incoming: ChatMessageDto): ChatMessageDto[] {
  const index = messages.findIndex((m) => m.id === incoming.id);
  if (index >= 0) {
    const existing = messages[index];
    if (!existing) return messages;
    const unchanged =
      existing.content === incoming.content &&
      existing.editedAt === incoming.editedAt &&
      Boolean(existing.pinned) === Boolean(incoming.pinned) &&
      existing.pinnedAt === incoming.pinnedAt;
    if (unchanged) return messages;
    const reactions =
      incoming.reactions && incoming.reactions.length > 0
        ? incoming.reactions
        : existing.reactions;
    const next = [...messages];
    next[index] = reactions !== undefined ? { ...existing, ...incoming, reactions } : { ...existing, ...incoming };
    return next;
  }
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

/** Soft-deletes a message in place so the thread displays a tombstone instead of removing it. */
export function markMessageDeleted(
  messages: ChatMessageDto[],
  messageId: string,
  deletedAt: string = new Date().toISOString()
): ChatMessageDto[] {
  let changed = false;
  const next = messages.map((m) => {
    if (m.id !== messageId) return m;
    changed = true;
    return {
      ...m,
      content: '',
      attachmentName: null,
      attachmentUrl: null,
      pinned: false,
      pinnedAt: null,
      deletedAt,
      reactions: [],
    };
  });
  return changed ? next : messages;
}

export function applyReaction(messages: ChatMessageDto[], event: ChatReactionEvent, currentUserId: string | null): ChatMessageDto[] {
  return messages.map((message) => {
    if (message.id !== event.messageId) return message;
    const summaries = message.reactions ?? [];
    const previous = summaries.find((entry) => entry.reactionKey === event.reactionKey);
    const next: ChatReactionSummaryDto = {
      reactionKey: event.reactionKey,
      count: event.count,
      reactedByMe: event.userId === currentUserId ? event.active : Boolean(previous?.reactedByMe),
    };
    const reactions = event.count > 0
      ? [...summaries.filter((entry) => entry.reactionKey !== event.reactionKey), next]
      : summaries.filter((entry) => entry.reactionKey !== event.reactionKey);
    return { ...message, reactions };
  });
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
